import { hasVisionRecommendation } from './recommendation';
import type { Shoe } from './shoeStore';

const FALLBACK_MARKERS = [
  'EXPO_PUBLIC_GOOGLE_AI_API_KEY',
  'OpenAI API 키',
  '사진만으로 세부 모델·쿠션 타입은 확정하기 어렵습니다',
];

/** 저장 시 Gemini 비전으로 분석했는지 */
export function shoeUsesGemini(shoe: Shoe): boolean {
  if (shoe.geminiAnalyzed === true) return true;
  if (shoe.geminiAnalyzed === false) return false;
  const rec = shoe.recommendation ?? '';
  if (FALLBACK_MARKERS.some((m) => rec.includes(m) || (shoe.traits ?? '').includes(m))) {
    return false;
  }
  return Boolean(shoe.brand?.trim() || shoe.model?.trim());
}

export function geminiStatusLabel(shoe: Shoe): string {
  if (!hasVisionRecommendation()) return 'API 키 필요';
  return shoeUsesGemini(shoe) ? 'Gemini 분석' : '기본 안내';
}
