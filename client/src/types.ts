export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  createdAt: string;
  tenantId: string;
}

export interface Segment {
  id: string;
  name: string;
  tenantId: string;
  createdAt: string;
  customers?: Customer[];
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  tenantId: string;
  segments?: Segment[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface CampaignStatus {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}
