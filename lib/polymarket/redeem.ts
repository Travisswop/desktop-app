// Redeem types — transaction construction is now handled by polymarket-backend.

export interface RedeemParams {
  conditionId: string;
  outcomeIndex: number;
  negativeRisk?: boolean;
  size?: number;
}
