import { formatAnalysisForStorage } from './recommendation';

export type ShoeAnalysisFields = {
  displayName: string;
  brand: string;
  model: string;
  traits: string;
  bestFor: string;
  caution: string;
};

export const EMPTY_ANALYSIS_FIELDS: ShoeAnalysisFields = {
  displayName: '',
  brand: '',
  model: '',
  traits: '',
  bestFor: '',
  caution: '',
};

export function fieldsFromAnalysis(a: {
  displayName: string;
  brand: string;
  model: string;
  traits: string;
  bestFor: string;
  caution: string;
}): ShoeAnalysisFields {
  return {
    displayName: a.displayName.trim(),
    brand: a.brand.trim(),
    model: a.model.trim(),
    traits: a.traits.trim(),
    bestFor: a.bestFor.trim(),
    caution: a.caution.trim(),
  };
}

export function parseRecommendationFields(recommendation: string): {
  bestFor: string;
  caution: string;
} {
  const rec = recommendation ?? '';
  const bestFor =
    rec.match(/【추천 용도】\s*\n([\s\S]*?)(?:\n\n【|$)/)?.[1]?.trim() ?? '';
  const caution = rec.match(/【참고】\s*\n([\s\S]*?)$/)?.[1]?.trim() ?? '';
  return { bestFor, caution };
}

export function fieldsFromShoe(shoe: {
  nickname: string;
  brand?: string;
  model?: string;
  traits?: string;
  recommendation?: string;
}): ShoeAnalysisFields {
  const extra = parseRecommendationFields(shoe.recommendation ?? '');
  return {
    displayName: shoe.nickname.trim(),
    brand: shoe.brand?.trim() ?? '',
    model: shoe.model?.trim() ?? '',
    traits: shoe.traits?.trim() ?? '',
    bestFor: extra.bestFor,
    caution: extra.caution,
  };
}

export function recommendationFromFields(
  fields: ShoeAnalysisFields,
  fromVision = true,
): string {
  const displayName = fields.displayName.trim() || '러닝화';
  return formatAnalysisForStorage({
    displayName,
    brand: fields.brand.trim(),
    model: fields.model.trim(),
    traits: fields.traits.trim() || '특징 정보 없음',
    bestFor: fields.bestFor.trim() || '용도 정보 없음',
    caution:
      fields.caution.trim() ||
      '사진만으로 정확한 모델·사이즈·마모 상태는 확인할 수 없습니다.',
    recommendation: '',
    fromVision,
  });
}
