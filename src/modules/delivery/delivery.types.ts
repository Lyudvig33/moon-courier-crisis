export interface PreviewError {
  code: string;
  message: string;
}

export interface DeliveryPreviewResult {
  possible: boolean;
  distance?: number;
  cargoWeight?: number;
  batteryCost?: number;
  travelTime?: number;
  risk?: number;
  reward?: number;
  warnings: string[];
  errors: PreviewError[];
}

export interface DeliveryResultResponse {
  delivery: {
    id: string;
    status: string;
    distance: number;
    cargoWeight: number;
    batteryCost: number;
    travelTime: number;
    finalRisk: number;
    reward: number;
  };
  success: boolean;
  moneyDelta: number;
  scoreDelta: number;
  batteryDelta: number;
  baseRatingDelta: number;
  message: string;
}
