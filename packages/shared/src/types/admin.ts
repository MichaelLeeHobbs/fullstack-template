// ===========================================
// Admin Types
// ===========================================

export interface AuditLog {
  id: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}
