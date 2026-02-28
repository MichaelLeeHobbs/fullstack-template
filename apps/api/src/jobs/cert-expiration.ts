// ===========================================
// Certificate Expiration Monitoring Job
// ===========================================
// Daily job that checks for expiring certificates and stale CRLs.
// Creates notifications for PKI administrators and updates expired cert status.

import type { PgBoss } from 'pg-boss';
import { and, eq, lt, gt, between, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import {
  certificates, CERT_STATUSES,
  certificateAuthorities,
  crls,
  users,
  userRoles,
  roles,
} from '../db/schema/index.js';
import { NotificationService } from '../services/notification.service.js';
import logger from '../lib/logger.js';

const QUEUE_NAME = 'pki.cert-expiration';

// Expiration warning windows (days)
const WARNING_WINDOWS = [30, 7, 1] as const;

/**
 * Check for expiring and expired certificates, create notifications,
 * and update status of expired certs.
 */
export async function checkCertificateExpiration(): Promise<void> {
  const now = new Date();

  try {
    // 1. Mark active certificates that have passed notAfter as expired
    const expired = await db
      .update(certificates)
      .set({ status: CERT_STATUSES.EXPIRED })
      .where(
        and(
          eq(certificates.status, CERT_STATUSES.ACTIVE),
          lt(certificates.notAfter, now),
        ),
      )
      .returning({ id: certificates.id, commonName: certificates.commonName });

    if (expired.length > 0) {
      logger.info({ count: expired.length }, 'Marked certificates as expired');
    }

    // 2. Check for certificates expiring within each warning window
    for (const days of WARNING_WINDOWS) {
      const windowStart = now;
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + days);

      // Only check exact window (e.g., 7-day means between now+6d and now+7d)
      // to avoid duplicate notifications on each run
      const rangeStart = new Date(now);
      rangeStart.setDate(rangeStart.getDate() + days - 1);

      const expiring = await db
        .select({
          id: certificates.id,
          commonName: certificates.commonName,
          notAfter: certificates.notAfter,
          certType: certificates.certType,
          issuingCaId: certificates.issuingCaId,
        })
        .from(certificates)
        .where(
          and(
            eq(certificates.status, CERT_STATUSES.ACTIVE),
            between(certificates.notAfter, rangeStart, windowEnd),
          ),
        );

      if (expiring.length > 0) {
        logger.info(
          { count: expiring.length, daysUntilExpiry: days },
          'Found certificates expiring soon',
        );

        // Notify PKI admins about expiring certificates
        const adminUserIds = await getPkiAdminUserIds();

        for (const cert of expiring) {
          for (const userId of adminUserIds) {
            await NotificationService.create({
              userId,
              title: `Certificate expiring in ${days} day${days > 1 ? 's' : ''}`,
              body: `Certificate "${cert.commonName}" (${cert.certType}) expires on ${cert.notAfter.toISOString().split('T')[0]}.`,
              type: 'warning',
              category: 'system',
              link: `/pki/certificates/${cert.id}`,
              metadata: {
                certificateId: cert.id,
                daysUntilExpiry: days,
              },
            }).catch(() => {});
          }
        }
      }
    }

    // 3. Check for stale CRLs (nextUpdate has passed)
    const staleCrls = await db
      .select({
        id: crls.id,
        caId: crls.caId,
        crlNumber: crls.crlNumber,
        nextUpdate: crls.nextUpdate,
      })
      .from(crls)
      .where(lt(crls.nextUpdate, now));

    if (staleCrls.length > 0) {
      // Get unique CA IDs with stale CRLs
      const staleCaIds = [...new Set(staleCrls.map((c) => c.caId))];

      // Only notify for the most recent CRL per CA
      const latestStaleCrls = staleCaIds.map((caId) => {
        const caCrls = staleCrls.filter((c) => c.caId === caId);
        return caCrls.sort((a, b) => b.crlNumber - a.crlNumber)[0]!;
      });

      const adminUserIds = await getPkiAdminUserIds();

      for (const crl of latestStaleCrls) {
        // Get CA name for notification
        const [ca] = await db
          .select({ name: certificateAuthorities.name })
          .from(certificateAuthorities)
          .where(eq(certificateAuthorities.id, crl.caId));

        const caName = ca?.name ?? 'Unknown CA';

        for (const userId of adminUserIds) {
          await NotificationService.create({
            userId,
            title: 'Stale CRL detected',
            body: `CRL #${crl.crlNumber} for "${caName}" expired on ${crl.nextUpdate.toISOString().split('T')[0]}. Generate a new CRL.`,
            type: 'error',
            category: 'system',
            link: `/pki/ca/${crl.caId}`,
            metadata: {
              caId: crl.caId,
              crlNumber: crl.crlNumber,
            },
          }).catch(() => {});
        }
      }

      logger.info(
        { count: latestStaleCrls.length },
        'Found stale CRLs needing regeneration',
      );
    }

    logger.info('Certificate expiration check completed');
  } catch (error) {
    logger.error({ error }, 'Certificate expiration check failed');
  }
}

/**
 * Get user IDs of PKI admins (users with the PKI Admin role).
 */
async function getPkiAdminUserIds(): Promise<string[]> {
  const results = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(roles.name, 'PKI Admin'));

  return results.map((r) => r.userId);
}

/**
 * Register the cert expiration check job with pg-boss.
 */
export async function registerCertExpirationHandler(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, { retryLimit: 1 });

  boss.work(QUEUE_NAME, async (_jobs) => {
    await checkCertificateExpiration();
  });

  // Run daily at 6:00 AM UTC
  await boss.schedule(QUEUE_NAME, '0 6 * * *');
}
