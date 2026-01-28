import { SetMetadata } from '@nestjs/common';

export const USAGE_FEATURE_KEY = 'usage_feature_key';
export const CheckUsage = (featureKey: string) =>
  SetMetadata(USAGE_FEATURE_KEY, featureKey);
