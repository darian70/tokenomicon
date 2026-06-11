import { env } from '@/lib/server/env';

interface DeepfakeChallenge {
  images: {
    id: string;
    url: string;
    isFake: boolean;
    position: number;
  }[];
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  round: number;
  maxRounds: number;
  fakePosition: number;
  metadata: {
    imagePrompt?: string;
    realImageIds?: string[];
  };
}

interface DeepfakeResult {
  correct: boolean;
  selectedPosition: number;
  fakePosition: number;
  round: number;
  continued: boolean;
  payoutMultiplier: number;
  nextDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  gameOver: boolean;
  totalPayout: number;
}

// Category prompts for AI generation
const CATEGORY_PROMPTS: Record<string, string[]> = {
  portrait: [
    'professional headshot of a business person, studio lighting',
    'casual selfie style photo of a young adult, natural lighting',
    'elderly person smiling, soft natural light',
    'teenager at a concert, colorful stage lighting',
  ],
  landscape: [
    'mountain lake at sunset, mirror reflection',
    'tropical beach with crystal clear water',
    'dense foggy forest with sunbeams',
    'desert sand dunes at golden hour',
  ],
  animals: [
    'close-up portrait of a majestic lion',
    'cute puppy in a basket, soft lighting',
    'exotic bird with vibrant plumage',
    'underwater shot of a sea turtle',
  ],
  architecture: [
    'modern glass skyscraper reflecting clouds',
    'cozy cottage in the countryside',
    'futuristic interior design, neon accents',
    'ancient temple ruins at sunrise',
  ],
  food: [
    'gourmet burger with perfect lighting',
    'colorful smoothie bowl from above',
    'steaming cup of artisanal coffee',
    'fresh sushi platter, professional food photography',
  ],
};

// Difficulty settings affect how realistic the fake is
const DIFFICULTY_CONFIG = {
  easy: {
    // Obvious artifacts: extra limbs, weird hands, unnatural lighting
    negativePrompt: 'perfect anatomy, photorealistic, professional quality',
    enhancePrompt: 'slightly blurry, minor artifacts, amateur photography',
    successProbability: 0.92,
  },
  medium: {
    // Some subtle issues
    negativePrompt: 'award winning photography',
    enhancePrompt: 'casual snapshot, natural imperfections',
    successProbability: 0.72,
  },
  hard: {
    // Very subtle - only experts spot it
    negativePrompt: '',
    enhancePrompt: 'high quality, professional photography',
    successProbability: 0.55,
  },
  expert: {
    // Latest model quality, nearly indistinguishable
    negativePrompt: '',
    enhancePrompt: 'photorealistic, 8k, professional photography, award winning',
    successProbability: 0.42,
  },
};

/**
 * Generate AI image using OpenAI DALL-E 3
 */
async function generateAIImage(
  category: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
): Promise<{ url: string; prompt: string }> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompts = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.portrait;
  const basePrompt = prompts[Math.floor(Math.random() * prompts.length)];
  const config = DIFFICULTY_CONFIG[difficulty];

  // Modify prompt based on difficulty
  let finalPrompt = basePrompt;
  if (config.enhancePrompt) {
    finalPrompt += ', ' + config.enhancePrompt;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: finalPrompt,
        size: '1024x1024',
        quality: difficulty === 'expert' ? 'hd' : 'standard',
        n: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DALL-E API error: ${error}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    return {
      url: imageUrl,
      prompt: finalPrompt,
    };
  } catch (error) {
    console.error('Failed to generate AI image:', error);
    throw new Error('Image generation failed');
  }
}

/**
 * Fetch real images from Unsplash
 */
async function fetchRealImages(
  category: string,
  count: number = 3
): Promise<{ url: string; id: string }[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    // Fallback: use placeholder images or throw
    throw new Error('Unsplash API key not configured');
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${category}&count=${count}&client_id=${accessKey}`,
      { next: { revalidate: 0 } }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((photo: { urls: { regular: string }; id: string }) => ({
      url: photo.urls.regular,
      id: photo.id,
    }));
  } catch (error) {
    console.error('Failed to fetch real images:', error);
    throw new Error('Real image fetch failed');
  }
}

/**
 * Create a deepfake challenge
 */
export async function createDeepfakeChallenge(
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy',
  round: number = 1,
  category?: string
): Promise<DeepfakeChallenge> {
  // Select random category if not specified
  const categories = Object.keys(CATEGORY_PROMPTS);
  const selectedCategory = category || categories[Math.floor(Math.random() * categories.length)];

  // Generate AI image (the fake)
  const aiImage = await generateAIImage(selectedCategory, difficulty);

  // Fetch 3 real images
  const realImages = await fetchRealImages(selectedCategory, 3);

  // Randomly position the fake (0-3)
  const fakePosition = Math.floor(Math.random() * 4);

  // Build image array
  const images: DeepfakeChallenge['images'] = [];
  let realIndex = 0;

  for (let i = 0; i < 4; i++) {
    if (i === fakePosition) {
      images.push({
        id: `fake-${Date.now()}`,
        url: aiImage.url,
        isFake: true,
        position: i,
      });
    } else {
      images.push({
        id: realImages[realIndex].id,
        url: realImages[realIndex].url,
        isFake: false,
        position: i,
      });
      realIndex++;
    }
  }

  return {
    images,
    category: selectedCategory,
    difficulty,
    round,
    maxRounds: 4,
    fakePosition,
    metadata: {
      imagePrompt: aiImage.prompt,
      realImageIds: realImages.map((img) => img.id),
    },
  };
}

/**
 * Calculate result and determine payout
 */
export function calculateDeepfakeResult(
  challenge: DeepfakeChallenge,
  selectedPosition: number,
  currentMultiplier: number = 1.0,
  continued: boolean = false
): DeepfakeResult {
  const correct = selectedPosition === challenge.fakePosition;

  // Multiplier progression based on difficulty
  const difficultyMultipliers = {
    easy: 1.3,
    medium: 1.8,
    hard: 2.5,
    expert: 4.0,
  };

  if (!correct) {
    return {
      correct: false,
      selectedPosition,
      fakePosition: challenge.fakePosition,
      round: challenge.round,
      continued,
      payoutMultiplier: 0,
      gameOver: true,
      totalPayout: 0,
    };
  }

  // Calculate new multiplier with continuation bonus
  let newMultiplier = currentMultiplier * difficultyMultipliers[challenge.difficulty];
  if (continued && challenge.round > 1) {
    newMultiplier *= 1.15; // 15% continuation bonus
  }

  // Determine next difficulty
  const difficultyProgression: Record<string, 'easy' | 'medium' | 'hard' | 'expert'> = {
    easy: 'medium',
    medium: 'hard',
    hard: 'expert',
    expert: 'expert',
  };

  const isFinalRound = challenge.round >= challenge.maxRounds;

  return {
    correct: true,
    selectedPosition,
    fakePosition: challenge.fakePosition,
    round: challenge.round,
    continued,
    payoutMultiplier: newMultiplier,
    nextDifficulty: isFinalRound ? undefined : difficultyProgression[challenge.difficulty],
    gameOver: !continued || isFinalRound,
    totalPayout: continued || isFinalRound ? Math.floor(newMultiplier * 100) : 0, // Base 100 credits
  };
}

/**
 * Get difficulty display name
 */
export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: '🔰 Easy (Obvious artifacts)',
    medium: '🎯 Medium (Some flaws)',
    hard: '💀 Hard (Expert level)',
    expert: '👁️ Expert (Indistinguishable)',
  };
  return labels[difficulty] || difficulty;
}

/**
 * Get category emoji
 */
export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    portrait: '👤',
    landscape: '🏞️',
    animals: '🦁',
    architecture: '🏗️',
    food: '🍔',
  };
  return emojis[category] || '🖼️';
}

export type { DeepfakeChallenge, DeepfakeResult };
