export interface OrderValueChange {
  id: string;
  serviceOrderId: string;
  previousValue: number | null;
  newValue: number;
  changeReason: string;
  changedBy: string;
  changedAt: string;
  createdAt: string;
}

export interface CreateOrderValueChangeParams {
  serviceOrderId: string;
  previousValue: number | null;
  newValue: number;
  changeReason: string;
  changedBy: string;
}
