import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SHOE_ANGLE_IDS, SHOE_ANGLE_META, type ShoeAngleId } from './shoeAngles';

/** 신규 AI Studio 계정은 2.0-flash 미지원 → 2.5-flash 기본 */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const GEMINI_MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
] as const;

const SHOE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    brand: { type: 'string', description: '브랜드명, 불확실하면 빈 문자열' },
    model: { type: 'string', description: '모델명, 불확실하면 빈 문자열' },
    displayName: { type: 'string', description: '한국어 표시 이름 (브랜드+모델)' },
    traits: { type: 'string', description: '외형·쿠션·트레드 특징 2~3문장, 한국어' },
    bestFor: { type: 'string', description: '추천 러닝 용도, 한국어' },
    caution: { type: 'string', description: '한 줄 주의사항, 한국어' },
  },
  required: ['brand', 'model', 'displayName', 'traits', 'bestFor', 'caution'],
} as const;

export type ShoePhotoAnalysis = {
  displayName: string;
  brand: string;
  model: string;
  traits: string;
  bestFor: string;
  caution: string;
  recommendation: string;
  fromVision: boolean;
};

function googleAiKey(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY ?? '').trim();
}

function geminiModelsToTry(): string[] {
  const custom = (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? '').trim();
  if (custom) return [custom];
  return [...GEMINI_MODEL_FALLBACKS];
}

function isRetryableModelError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('no longer available') ||
    m.includes('not found') ||
    m.includes('not_found') ||
    m.includes('does not exist')
  );
}

export function hasVisionRecommendation(): boolean {
  return googleAiKey().length >= 20;
}

async function uriToVisionBase64(imageUri: string): Promise<string> {
  const out = await manipulateAsync(
    imageUri,
    [{ resize: { width: 1024 } }],
    { compress: 0.82, format: SaveFormat.JPEG, base64: true },
  );
  if (!out.base64) {
    throw new Error('이미지를 인코딩하지 못했습니다.');
  }
  return out.base64;
}

function fallbackAnalysis(userHint: string): ShoePhotoAnalysis {
  const hint = userHint.trim();
  const displayName = hint || '이름 미확인 러닝화';
  const traits =
    '사진만으로 세부 모델·쿠션 타입은 확정하기 어렵습니다. 밑창 두께·어퍼 소재·트레드 패턴을 직접 확인해 보세요.';
  const bestFor = '이지런·회복런·가벼운 템포런 후보로 생각해 볼 수 있습니다.';
  const caution =
    'Google AI Studio API 키(EXPO_PUBLIC_GOOGLE_AI_API_KEY)를 .env에 넣고 앱을 다시 시작하면 사진 기반 자동 분석이 가능합니다.';
  return {
    displayName,
    brand: '',
    model: '',
    traits,
    bestFor,
    caution,
    recommendation: formatAnalysisForStorage({
      displayName,
      brand: '',
      model: '',
      traits,
      bestFor,
      caution,
      recommendation: '',
      fromVision: false,
    }),
    fromVision: false,
  };
}

export function formatAnalysisForStorage(a: ShoePhotoAnalysis): string {
  const lines = ['【AI 사진 분석】', `이름: ${a.displayName}`];
  if (a.brand) lines.push(`브랜드: ${a.brand}`);
  if (a.model) lines.push(`모델: ${a.model}`);
  lines.push(
    '',
    '【특징】',
    a.traits,
    '',
    '【추천 용도】',
    a.bestFor,
    '',
    '【참고】',
    a.caution,
  );
  return lines.join('\n');
}

function extractJsonBlob(raw: string): string {
  const cleaned = raw.replace(/```json\s*|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  if (start < 0) return cleaned;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }

  let fragment = cleaned.slice(start);
  if ((fragment.match(/"/g)?.length ?? 0) % 2 === 1) fragment += '"';
  const opens = (fragment.match(/{/g) ?? []).length;
  const closes = (fragment.match(/}/g) ?? []).length;
  for (let i = 0; i < opens - closes; i++) fragment += '}';
  return fragment;
}

function scrapeJsonFields(text: string): Partial<Record<string, string>> {
  const keys = ['brand', 'model', 'displayName', 'traits', 'bestFor', 'caution'] as const;
  const out: Partial<Record<string, string>> = {};
  for (const key of keys) {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
    const m = text.match(re);
    if (m?.[1]) {
      out[key] = m[1].replace(/\\n/g, ' ').trim();
      continue;
    }
    const loose = new RegExp(`"${key}"\\s*:\\s*"([^"]{1,400})`, 's');
    const m2 = text.match(loose);
    if (m2?.[1]) out[key] = m2[1].trim();
  }
  return out;
}

function buildAnalysisFromFields(
  parsed: Partial<Record<string, string>>,
  userHint: string,
): ShoePhotoAnalysis | null {
  const brand = String(parsed.brand ?? '').trim();
  const model = String(parsed.model ?? '').trim();
  const displayName =
    String(parsed.displayName ?? '').trim() ||
    [brand, model].filter(Boolean).join(' ').trim() ||
    userHint.trim();
  const traits = String(parsed.traits ?? '').trim();
  const bestFor = String(parsed.bestFor ?? '').trim();

  const hasContent = Boolean(
    displayName || brand || (traits && !traits.includes('{') && traits.length > 12),
  );
  if (!hasContent) return null;

  const base: ShoePhotoAnalysis = {
    displayName: displayName || '러닝화',
    brand,
    model,
    traits: traits && !traits.startsWith('{') ? traits : buildTraitsFromParts(brand, model, parsed),
    bestFor: bestFor || '이지런·회복런·데일리 조깅에 무난해 보입니다.',
    caution:
      String(parsed.caution ?? '').trim() ||
      '사진만으로 정확한 모델·사이즈·마모 상태는 확인할 수 없습니다.',
    recommendation: '',
    fromVision: true,
  };
  base.recommendation = formatAnalysisForStorage(base);
  return base;
}

function buildTraitsFromParts(
  brand: string,
  model: string,
  parsed: Partial<Record<string, string>>,
): string {
  const parts: string[] = [];
  if (brand) parts.push(`${brand} 브랜드로 보입니다.`);
  if (model) parts.push(`모델은 ${model} 계열로 추정됩니다.`);
  if (parsed.traits && !parsed.traits.includes('{')) parts.push(parsed.traits);
  return parts.join(' ') || '사진에서 뚜렷한 쿠션·트레드 특징을 읽기 어렵습니다.';
}

function parseVisionJson(raw: string, userHint: string): ShoePhotoAnalysis | null {
  const blob = extractJsonBlob(raw);
  try {
    const parsed = JSON.parse(blob) as Record<string, unknown>;
    const normalized: Partial<Record<string, string>> = {};
    for (const k of ['brand', 'model', 'displayName', 'traits', 'bestFor', 'caution']) {
      if (parsed[k] != null) normalized[k] = String(parsed[k]).trim();
    }
    return buildAnalysisFromFields(normalized, userHint);
  } catch {
    return buildAnalysisFromFields(scrapeJsonFields(raw), userHint);
  }
}

function isWeakAnalysis(a: ShoePhotoAnalysis | null): boolean {
  if (!a) return true;
  const t = a.traits;
  return (
    t.includes('{') ||
    t.includes('"brand"') ||
    t.length < 15 ||
    (a.displayName === '러닝화' && !a.brand && !a.model)
  );
}

function buildShoePrompt(userHint: string, strict = false): string {
  const hint =
    userHint.trim().length > 0
      ? `사용자 힌트: "${userHint.trim()}"`
      : '사용자 힌트 없음';

  if (strict) {
    return [
      '러닝화 사진 분석. 반드시 완전한 JSON만 출력(마크다운 금지).',
      '모든 값은 한국어 문장. brand, model, displayName, traits(2문장), bestFor, caution 필수.',
      'JSON이 중간에 끊기면 안 됨.',
      hint,
    ].join(' ');
  }

  return [
    '러닝화 사진을 보고 분석해. 정면·왼쪽·오른쪽 사진을 함께 참고해.',
    'JSON만 출력: brand, model, displayName(한국어 한 줄),',
    'traits(쿠션·어퍼·밑창·트레드 2~3문장), bestFor(이지런/템포/LSD/트레일 등), caution(한 줄).',
    '보이는 로고·형태·색·밑창 패턴을 근거로 구체적으로. 불확실하면 "~로 보임".',
    hint,
  ].join(' ');
}

type LabeledImage = { label: string; base64: string };

async function requestGeminiWithModel(
  model: string,
  images: LabeledImage[],
  userHint: string,
  prompt: string,
): Promise<ShoePhotoAnalysis> {
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    { text: prompt },
  ];
  for (const img of images) {
    parts.push({ text: `${img.label} 사진:` });
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: img.base64,
      },
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(googleAiKey())}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: SHOE_JSON_SCHEMA,
      },
    }),
  });

  const json = (await res.json()) as {
    error?: { message?: string; status?: string };
    candidates?: {
      finishReason?: string;
      content?: { parts?: { text?: string }[] };
    }[];
  };

  if (!res.ok) {
    const msg = json.error?.message ?? res.statusText;
    throw new Error(msg || 'Gemini 요청 실패');
  }

  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) {
    throw new Error('Gemini 응답이 비어 있습니다.');
  }

  const parsed = parseVisionJson(text, userHint);
  if (!parsed || isWeakAnalysis(parsed)) {
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error('응답이 잘렸습니다. 다시 시도합니다.');
    }
    throw new Error('분석 결과를 읽지 못했습니다. 다시 시도합니다.');
  }
  return parsed;
}

async function requestGeminiShoeAnalysis(
  images: LabeledImage[],
  userHint: string,
): Promise<ShoePhotoAnalysis> {
  const models = geminiModelsToTry();
  let lastError: Error | null = null;

  for (const model of models) {
    for (const strict of [false, true]) {
      try {
        const prompt = buildShoePrompt(userHint, strict);
        return await requestGeminiWithModel(model, images, userHint, prompt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isRetryableModelError(msg)) {
          lastError = e instanceof Error ? e : new Error(msg);
          break;
        }
        lastError = e instanceof Error ? e : new Error(msg);
      }
    }
    if (lastError && isRetryableModelError(lastError.message)) {
      console.warn(`Gemini 모델 ${model} 사용 불가, 다음 모델 시도`);
      continue;
    }
  }

  throw lastError ?? new Error('사용 가능한 Gemini 모델이 없습니다.');
}

export function activeGeminiModelHint(): string {
  const custom = (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? '').trim();
  return custom || DEFAULT_GEMINI_MODEL;
}

function labeledImagesFromUris(
  imageUris: string[],
  angleOrder: ShoeAngleId[] = [...SHOE_ANGLE_IDS],
): Promise<LabeledImage[]> {
  return Promise.all(
    imageUris.map(async (uri, i) => {
      const angle = angleOrder[i];
      const label = angle ? SHOE_ANGLE_META[angle].label : `각도${i + 1}`;
      return { label, base64: await uriToVisionBase64(uri) };
    }),
  );
}

/**
 * 정면·왼쪽·오른쪽 등 여러 사진으로 러닝화를 분석합니다.
 */
export async function analyzeShoePhotos(
  imageUris: string[],
  userHint = '',
  angleOrder: ShoeAngleId[] = [...SHOE_ANGLE_IDS],
): Promise<ShoePhotoAnalysis> {
  const uris = imageUris.filter((u) => u?.trim());
  if (uris.length === 0) {
    return fallbackAnalysis(userHint);
  }
  if (!hasVisionRecommendation()) {
    return fallbackAnalysis(userHint);
  }
  try {
    const images = await labeledImagesFromUris(uris, angleOrder.slice(0, uris.length));
    return await requestGeminiShoeAnalysis(images, userHint);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const fb = fallbackAnalysis(userHint);
    fb.traits = `분석 오류: ${msg}`;
    fb.caution = 'Google AI Studio 키·네트워크를 확인한 뒤 상세 화면에서 다시 분석해 보세요.';
    fb.recommendation = formatAnalysisForStorage(fb);
    return fb;
  }
}

/** 단일 사진 분석 (상세 재분석·호환) */
export async function analyzeShoePhoto(
  imageUri: string,
  userHint = '',
): Promise<ShoePhotoAnalysis> {
  return analyzeShoePhotos([imageUri], userHint);
}

/** @deprecated analyzeShoePhotos 사용 */
export async function getRunningShoeRecommendationFromUri(
  imageUri: string,
  nickname: string,
): Promise<string> {
  const a = await analyzeShoePhoto(imageUri, nickname);
  return a.recommendation;
}
