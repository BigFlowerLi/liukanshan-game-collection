import {
  ArrowUp,
  Bomb,
  ChevronLeft,
  Circle,
  Flag,
  Fish,
  Gamepad2,
  Grid3X3,
  Home,
  Leaf,
  Lightbulb,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Timer,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FISHING_FISH } from "./fishingData";

const ASSETS = {
  arcadeHero: "/assets/arcade-hero-3d.png",
  snakeStage: "/assets/snake-stage-3d.png",
  minesStage: "/assets/mines-stage-3d.png",
  snakeCover: "/assets/covers/snake-cover.png",
  minesCover: "/assets/covers/mines-cover.png",
  solitaireCover: "/assets/covers/solitaire-cover.png",
  matchCover: "/assets/covers/match-cover.png",
  bubbleCover: "/assets/covers/bubble-cover.png",
  linkCover: "/assets/covers/link-cover.png",
  fishingCover: "/assets/covers/fishing-cover-v2.png",
  fishingStage: "/assets/fishing/fishing-stage-bg-v3.png",
  fishingCodex: "/assets/fishing/fish-codex.png",
  fishingPoses: {
    idle: "/assets/fishing/poses/kanshan-idle.png",
    cast: "/assets/fishing/poses/kanshan-cast.png",
    bite: "/assets/fishing/poses/kanshan-bite-alert.png",
    reel: "/assets/fishing/poses/kanshan-reel-hard.png",
    catch: "/assets/fishing/poses/kanshan-catch-success.png",
  },
  kanshanBubbleOperator: "/assets/bubble/kanshan-cannon-operator-v2.png",
  kanshanHead: "/assets/kanshan-head-sprite.png",
};
const SOLITAIRE_KANSHAN = {
  idle: "/assets/solitaire/kanshan-card-idle.png",
  spades: "/assets/solitaire/kanshan-card-king.png",
  hearts: "/assets/solitaire/kanshan-card-queen.png",
  clubs: "/assets/solitaire/kanshan-card-jack.png",
  diamonds: "/assets/solitaire/kanshan-card-ace.png",
  back: "/assets/solitaire/kanshan-card-back.png",
  peek: "/assets/solitaire/kanshan-card-peek.png",
  seal: "/assets/solitaire/kanshan-card-seal.png",
} as const;
const SOLITAIRE_VICTORY_ART = "/assets/solitaire/kanshan-victory-trophy.png";

type Screen =
  | "hub"
  | "snake"
  | "minesweeper"
  | "solitaire"
  | "match"
  | "link"
  | "bubble"
  | "fishing";
type DirectionName = "up" | "down" | "left" | "right";
type Point = { x: number; y: number };
type GameTone = (frequency?: number, duration?: number, type?: OscillatorType) => void;
type CardSuit = "spades" | "hearts" | "clubs" | "diamonds";
type CardRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
type SolitaireKanshanVariant = keyof typeof SOLITAIRE_KANSHAN;
type SolitaireSuitKanshanVariant = Extract<SolitaireKanshanVariant, CardSuit>;
type SolitaireCardModel = {
  id: string;
  rank: CardRank;
  suit: CardSuit;
  faceUp: boolean;
};
type SolitaireBoard = {
  stock: SolitaireCardModel[];
  waste: SolitaireCardModel[];
  foundations: Record<CardSuit, SolitaireCardModel[]>;
  tableau: SolitaireCardModel[][];
  moves: number;
};
type SolitaireMoveSource =
  | { type: "waste" }
  | { type: "foundation"; suit: CardSuit }
  | { type: "tableau"; columnIndex: number; cardIndex: number };
type SolitaireMoveTarget =
  | { type: "foundation"; suit: CardSuit }
  | { type: "tableau"; columnIndex: number };
type SolitaireMoveResult = {
  board: SolitaireBoard;
  moved: boolean;
};

const SNAKE_SIZE = 18;
const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 },
];
const DIRECTIONS: Record<DirectionName, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<DirectionName, DirectionName> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const MINE_ROWS = 10;
const MINE_COLS = 10;
const MINE_COUNT = 14;
const MATCH_SIZE = 8;
const LINK_ROWS = 7;
const LINK_COLS = 8;
const BUBBLE_ROWS = 10;
const BUBBLE_COLS = 9;
const BUBBLE_CANNON_X = (BUBBLE_COLS - 1) / 2;
const BUBBLE_ROW_STEP = 0.86;
const BUBBLE_AIM_LIMIT = 66;
const BUBBLE_TRACE_STEP = 0.028;
const BUBBLE_COLLISION_RADIUS = 0.98;
const BUBBLE_KILL_ROW = BUBBLE_ROWS - 1;
const SOLITAIRE_COLUMN_COUNT = 7;
const SOLITAIRE_TABLEAU_CARD_GAP = 34;
const SOLITAIRE_TABLEAU_CARD_HEIGHT = 148;
const CARD_SUITS: CardSuit[] = ["spades", "hearts", "clubs", "diamonds"];
const CARD_RANKS: CardRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUIT_MARKS: Record<CardSuit, string> = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
};
const CARD_SUIT_LABELS: Record<CardSuit, string> = {
  spades: "黑桃",
  hearts: "红桃",
  clubs: "梅花",
  diamonds: "方块",
};
const CARD_SUIT_COLORS: Record<CardSuit, string> = {
  spades: "#1f1c19",
  hearts: "#d93f45",
  clubs: "#1f1c19",
  diamonds: "#d93f45",
};
const CARD_SUIT_KANSHAN: Record<CardSuit, SolitaireSuitKanshanVariant> = {
  spades: "spades",
  hearts: "hearts",
  clubs: "clubs",
  diamonds: "diamonds",
};
const MATCH_KINDS = ["kanshan", "petal", "kanshanPetal", "question", "orb", "leaf"] as const;
const MATCH_TILES: Record<MatchKind, { image: string; label: string }> = {
  kanshan: { image: "/assets/match/themes/level-1/garden-kanshan-kite.png", label: "看山" },
  petal: { image: "/assets/match/themes/level-1/garden-sakura.png", label: "花瓣" },
  kanshanPetal: { image: "/assets/match/themes/level-1/garden-cloud-bell.png", label: "花礼" },
  question: { image: "/assets/match/themes/level-1/garden-kite.png", label: "问题" },
  orb: { image: "/assets/match/themes/level-1/garden-peach-candy.png", label: "灵感" },
  leaf: { image: "/assets/match/themes/level-1/garden-sun-coin.png", label: "嫩叶" },
};
const MATCH_SPECIAL_TILES: Record<MatchSpecial, { image: string; label: string }> = {
  row: { image: "/assets/match/special-row.png", label: "横向灵感火箭" },
  col: { image: "/assets/match/special-col.png", label: "纵向灵感火箭" },
  bomb: { image: "/assets/match/special-bomb.png", label: "花瓣爆炸包" },
  rainbow: { image: "/assets/match/special-rainbow.png", label: "彩虹灵感球" },
};
const MATCH_LEVEL_TILE_SETS: Array<Record<MatchKind, { image: string; label: string }>> = [
  {
    kanshan: { image: "/assets/match/themes/level-1/garden-kanshan-kite.png", label: "看山风筝" },
    petal: { image: "/assets/match/themes/level-1/garden-sakura.png", label: "樱花挂坠" },
    question: { image: "/assets/match/themes/level-1/garden-kite.png", label: "彩色纸鸢" },
    orb: { image: "/assets/match/themes/level-1/garden-peach-candy.png", label: "蜜桃软糖" },
    kanshanPetal: { image: "/assets/match/themes/level-1/garden-cloud-bell.png", label: "云朵铃" },
    leaf: { image: "/assets/match/themes/level-1/garden-sun-coin.png", label: "小太阳币" },
  },
  {
    kanshan: { image: "/assets/match/themes/level-2/book-kanshan-book.png", label: "看山书签" },
    petal: { image: "/assets/match/themes/level-2/book-page.png", label: "蓝色书页" },
    question: { image: "/assets/match/themes/level-2/book-ink-spark.png", label: "墨水星滴" },
    orb: { image: "/assets/match/themes/level-2/book-lantern.png", label: "答案灯" },
    kanshanPetal: { image: "/assets/match/themes/level-2/book-leaf-note.png", label: "叶子便笺" },
    leaf: { image: "/assets/match/themes/level-2/book-wax-seal.png", label: "奶油印章" },
  },
  {
    kanshan: { image: "/assets/match/themes/level-3/star-kanshan-wand.png", label: "看山星杖" },
    petal: { image: "/assets/match/themes/level-3/star-moon-bubble.png", label: "月亮泡泡" },
    question: { image: "/assets/match/themes/level-3/star-gem.png", label: "星尘宝石" },
    orb: { image: "/assets/match/themes/level-3/star-comet.png", label: "彩虹彗星" },
    kanshanPetal: { image: "/assets/match/themes/level-3/star-night-flower.png", label: "夜光花" },
    leaf: { image: "/assets/match/themes/level-3/star-galaxy-orb.png", label: "银河球" },
  },
  {
    kanshan: { image: "/assets/match/themes/level-4/tea-kanshan-umbrella.png", label: "看山茶伞" },
    petal: { image: "/assets/match/themes/level-4/tea-jasmine.png", label: "茉莉花章" },
    question: { image: "/assets/match/themes/level-4/tea-umbrella.png", label: "青茶小伞" },
    orb: { image: "/assets/match/themes/level-4/tea-cup.png", label: "绿茶杯" },
    kanshanPetal: { image: "/assets/match/themes/level-4/tea-raindrop.png", label: "雨滴晴符" },
    leaf: { image: "/assets/match/themes/level-4/tea-honey.png", label: "蜂蜜罐" },
  },
  {
    kanshan: { image: "/assets/match/themes/level-5/sea-kanshan-sailboat.png", label: "看山帆船" },
    petal: { image: "/assets/match/themes/level-5/sea-pearl-shell.png", label: "珍珠贝壳" },
    question: { image: "/assets/match/themes/level-5/sea-wave-gem.png", label: "海浪晶石" },
    orb: { image: "/assets/match/themes/level-5/sea-lighthouse.png", label: "灯塔" },
    kanshanPetal: { image: "/assets/match/themes/level-5/sea-coral-flower.png", label: "珊瑚花" },
    leaf: { image: "/assets/match/themes/level-5/sea-star-bottle.png", label: "星星漂流瓶" },
  },
  {
    kanshan: { image: "/assets/match/themes/level-6/market-kanshan-lantern.png", label: "看山灯笼" },
    petal: { image: "/assets/match/themes/level-6/market-lantern.png", label: "花灯" },
    question: { image: "/assets/match/themes/level-6/market-tanghulu.png", label: "糖葫芦" },
    orb: { image: "/assets/match/themes/level-6/market-fish-kite.png", label: "锦鲤风筝" },
    kanshanPetal: { image: "/assets/match/themes/level-6/market-drum.png", label: "小鼓" },
    leaf: { image: "/assets/match/themes/level-6/market-coin-pouch.png", label: "福袋" },
  },
  {
    kanshan: { image: "/assets/match/themes/level-7/snow-kanshan-mail.png", label: "看山邮差" },
    petal: { image: "/assets/match/themes/level-7/snow-pine-badge.png", label: "雪松徽章" },
    question: { image: "/assets/match/themes/level-7/snowflake-crystal.png", label: "水晶雪花" },
    orb: { image: "/assets/match/themes/level-7/snow-mailbox.png", label: "暖邮箱" },
    kanshanPetal: { image: "/assets/match/themes/level-7/snow-mountain-stamp.png", label: "雪山邮票" },
    leaf: { image: "/assets/match/themes/level-7/snow-cocoa.png", label: "热可可" },
  },
];
const MATCH_LEVELS = [
  {
    title: "樱花初醒",
    target: 760,
    moves: 24,
    kinds: ["kanshan", "petal", "question", "orb"] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[0],
    difficulty: "普通",
    reward: 28,
  },
  {
    title: "书页微光",
    target: 1120,
    moves: 25,
    kinds: ["kanshan", "petal", "question", "orb"] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[1],
    difficulty: "普通",
    reward: 34,
  },
  {
    title: "星桥试炼",
    target: 1680,
    moves: 27,
    kinds: ["kanshan", "petal", "kanshanPetal", "question", "orb"] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[2],
    difficulty: "挑战",
    reward: 42,
  },
  {
    title: "雨茶慢行",
    target: 2050,
    moves: 28,
    kinds: ["kanshan", "petal", "kanshanPetal", "question", "orb"] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[3],
    difficulty: "挑战",
    reward: 48,
  },
  {
    title: "海风拾贝",
    target: 2500,
    moves: 29,
    kinds: ["kanshan", "petal", "kanshanPetal", "question", "orb"] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[4],
    difficulty: "挑战",
    reward: 54,
  },
  {
    title: "灯会连环",
    target: 3050,
    moves: 30,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[5],
    difficulty: "困难",
    reward: 64,
  },
  {
    title: "雪邮急件",
    target: 3650,
    moves: 31,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[6],
    difficulty: "困难",
    reward: 72,
  },
  {
    title: "花园回响",
    target: 4300,
    moves: 31,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[0],
    difficulty: "困难",
    reward: 82,
  },
  {
    title: "书海问答",
    target: 5000,
    moves: 32,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[1],
    difficulty: "困难",
    reward: 92,
  },
  {
    title: "银河派对",
    target: 5750,
    moves: 33,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[2],
    difficulty: "大师",
    reward: 106,
  },
  {
    title: "茶雨连锁",
    target: 6650,
    moves: 34,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[3],
    difficulty: "大师",
    reward: 118,
  },
  {
    title: "海灯同航",
    target: 7600,
    moves: 34,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[4],
    difficulty: "大师",
    reward: 130,
  },
  {
    title: "夜市大爆发",
    target: 8700,
    moves: 35,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[5],
    difficulty: "大师",
    reward: 146,
  },
  {
    title: "雪山终章",
    target: 9900,
    moves: 36,
    kinds: [...MATCH_KINDS] as MatchKind[],
    tiles: MATCH_LEVEL_TILE_SETS[6],
    difficulty: "大师",
    reward: 164,
  },
];
const LINK_LEVELS = [
  {
    title: "问答花廊",
    kinds: ["kanshan", "petal", "question", "orb"] as MatchKind[],
  },
  {
    title: "看山小径",
    kinds: ["kanshan", "petal", "kanshanPetal", "question", "orb"] as MatchKind[],
  },
  {
    title: "灵感星桥",
    kinds: [...MATCH_KINDS] as MatchKind[],
  },
];
const LINK_PAIR_COPY: Record<MatchKind, { question: string; answer: string }> = {
  kanshan: { question: "谁在看山？", answer: "刘看山" },
  petal: { question: "花瓣落在哪？", answer: "春日路上" },
  kanshanPetal: { question: "看山收到？", answer: "一束花礼" },
  question: { question: "好答案来自？", answer: "好问题" },
  orb: { question: "发光的点子？", answer: "灵感球" },
  leaf: { question: "新叶代表？", answer: "新想法" },
};
const BUBBLE_LEVELS = [
  {
    title: "灵感初泡",
    shots: 28,
    filledRows: 4,
    kinds: ["kanshan", "petal", "question", "orb"] as MatchKind[],
  },
  {
    title: "花园连发",
    shots: 32,
    filledRows: 5,
    kinds: ["kanshan", "petal", "kanshanPetal", "question", "orb"] as MatchKind[],
  },
  {
    title: "满盒彩泡",
    shots: 36,
    filledRows: 6,
    kinds: [...MATCH_KINDS] as MatchKind[],
  },
];

type MineStatus = "ready" | "running" | "won" | "lost";
type SnakeStatus = "ready" | "running" | "paused" | "ended";
type MatchKind = (typeof MATCH_KINDS)[number];
type MatchSpecial = "row" | "col" | "bomb" | "rainbow";
type MatchStatus = "playing" | "advancing" | "won" | "lost" | "stuck" | "settling";
type LinkStatus = "playing" | "won" | "stuck";
type BubbleStatus = "playing" | "won" | "lost";
type LinkSide = "question" | "answer";
type MatchTile = {
  id: number;
  kind: MatchKind;
  special?: MatchSpecial;
};
type MatchBoard = Array<MatchTile | null>;
type MatchDragStart = {
  index: number;
  x: number;
  y: number;
};
type MatchDragPreview = {
  x: number;
  y: number;
  target: number | null;
};
type MatchSwapMotion = {
  first: number;
  second: number;
  phase: "forward" | "back";
};
type MatchFx = {
  id: number;
  origin: number;
  target?: number;
  specials: MatchSpecial[];
  cleared: number[];
  combo: boolean;
};
type MatchReward = {
  stars: number;
  coins: number;
  streak: number;
  streakBonus: number;
  chestGain: number;
  chestProgress: number;
  chestOpened: boolean;
  chestBonus: number;
};
type LinkCell = {
  id: number;
  pairId: number;
  kind: MatchKind;
  side: LinkSide;
  text: string;
  removed: boolean;
};
type BubbleCell = {
  id: number;
  kind: MatchKind;
};
type BubbleShot = {
  id: number;
  kind: MatchKind;
  targetIndex: number;
  distance: number;
  path: Point[];
};
type MineCell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

const MATCH_SPECIAL_ARM_DELAY = 360;
const MATCH_SWAP_DELAY = 260;
const MATCH_SWAP_BACK_DELAY = 230;
const MATCH_FX_CLEAR_DELAY = 520;
const MATCH_STAGE_CLEAR_DELAY = 360;
const MATCH_STAGE_FILL_DELAY = 500;
const MATCH_SETTLE_DELAY = 260;
const MATCH_CHEST_GOAL = 12;

function readNumber(key: string, fallback = 0) {
  const value = window.localStorage.getItem(key);
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function writeNumber(key: string, value: number) {
  window.localStorage.setItem(key, String(value));
}

function readStringArray(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStringArray(key: string, value: string[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

type FishingFish = (typeof FISHING_FISH)[number];
type FishingPhase = "ready" | "casting" | "waiting" | "bite" | "reeling" | "caught" | "escaped";

const FISHING_RARITY_WEIGHTS: Record<FishingFish["rarity"], number> = {
  common: 36,
  uncommon: 24,
  rare: 17,
  epic: 8,
  legendary: 3,
};
const FISHING_SWEET_ZONE_WIDTH = 38;
const FISHING_SWIM_LANES = [
  { startX: 55, startY: 35, dx: -24, dy: 22, scale: 0.34, endScale: 0.92, duration: 18, delay: -2 },
  { startX: 68, startY: 40, dx: -34, dy: 19, scale: 0.32, endScale: 0.88, duration: 22, delay: -9 },
  { startX: 43, startY: 42, dx: 27, dy: 19, scale: 0.34, endScale: 0.9, duration: 20, delay: -5 },
  { startX: 78, startY: 49, dx: -38, dy: 17, scale: 0.42, endScale: 1, duration: 17, delay: -13 },
  { startX: 58, startY: 54, dx: 22, dy: 11, scale: 0.48, endScale: 0.98, duration: 19, delay: -7 },
  { startX: 34, startY: 45, dx: 36, dy: 19, scale: 0.32, endScale: 0.82, duration: 24, delay: -16 },
  { startX: 84, startY: 58, dx: -43, dy: 9, scale: 0.56, endScale: 1.08, duration: 18, delay: -11 },
  { startX: 50, startY: 33, dx: 30, dy: 26, scale: 0.3, endScale: 0.78, duration: 26, delay: -20 },
] as const;

function pickFishingFish() {
  const totalWeight = FISHING_FISH.reduce(
    (sum, fish) => sum + FISHING_RARITY_WEIGHTS[fish.rarity],
    0,
  );
  let cursor = Math.random() * totalWeight;

  for (const fish of FISHING_FISH) {
    cursor -= FISHING_RARITY_WEIGHTS[fish.rarity];

    if (cursor <= 0) {
      return fish;
    }
  }

  return FISHING_FISH[0];
}

function matchStarTargets(level: (typeof MATCH_LEVELS)[number]) {
  return [
    level.target,
    Math.round(level.target * 1.28),
    Math.round(level.target * 1.68),
  ];
}

function calculateMatchStars(score: number, level: (typeof MATCH_LEVELS)[number]) {
  const targets = matchStarTargets(level);

  if (score >= targets[2]) {
    return 3;
  }

  if (score >= targets[1]) {
    return 2;
  }

  return score >= targets[0] ? 1 : 0;
}

function matchChestGain(stars: number, difficulty: string) {
  const difficultyBonus = difficulty === "大师" ? 2 : difficulty === "困难" ? 1 : 0;

  return stars + difficultyBonus;
}

function createMatchReward(
  level: (typeof MATCH_LEVELS)[number],
  score: number,
  movesLeft: number,
  streak: number,
  currentChestProgress: number,
): MatchReward {
  const stars = calculateMatchStars(score, level);
  const chestGain = matchChestGain(stars, level.difficulty);
  const chestTotal = currentChestProgress + chestGain;
  const chestOpened = chestTotal >= MATCH_CHEST_GOAL;
  const chestBonus = chestOpened ? 60 : 0;
  const streakBonus = Math.min(streak, 5) * 8;
  const movesBonus = Math.max(0, movesLeft) * 2;

  return {
    stars,
    coins: level.reward + stars * 12 + streakBonus + movesBonus + chestBonus,
    streak,
    streakBonus,
    chestGain,
    chestProgress: chestTotal % MATCH_CHEST_GOAL,
    chestOpened,
    chestBonus,
  };
}

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function randomFood(occupied: Point[]) {
  const taken = new Set(occupied.map((point) => `${point.x},${point.y}`));
  const open: Point[] = [];

  for (let y = 0; y < SNAKE_SIZE; y += 1) {
    for (let x = 0; x < SNAKE_SIZE; x += 1) {
      if (!taken.has(`${x},${y}`)) {
        open.push({ x, y });
      }
    }
  }

  return open[Math.floor(Math.random() * open.length)] ?? { x: 0, y: 0 };
}

function createEmptyMineBoard(): MineCell[] {
  return Array.from({ length: MINE_ROWS * MINE_COLS }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
}

function mineNeighbors(index: number) {
  const row = Math.floor(index / MINE_COLS);
  const col = index % MINE_COLS;
  const neighbors: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (
        nextRow >= 0 &&
        nextRow < MINE_ROWS &&
        nextCol >= 0 &&
        nextCol < MINE_COLS
      ) {
        neighbors.push(nextRow * MINE_COLS + nextCol);
      }
    }
  }

  return neighbors;
}

function createMineBoard(safeIndex: number) {
  const board = createEmptyMineBoard();
  const safe = new Set([safeIndex, ...mineNeighbors(safeIndex)]);
  const candidates = board
    .map((_, index) => index)
    .filter((index) => !safe.has(index))
    .sort(() => Math.random() - 0.5);

  candidates.slice(0, MINE_COUNT).forEach((index) => {
    board[index].mine = true;
  });

  board.forEach((cell, index) => {
    cell.adjacent = mineNeighbors(index).filter((neighbor) => board[neighbor].mine).length;
  });

  return board;
}

function revealMines(board: MineCell[]) {
  return board.map((cell) => ({
    ...cell,
    revealed: cell.revealed || cell.mine,
  }));
}

function floodReveal(board: MineCell[], startIndex: number) {
  const next = board.map((cell) => ({ ...cell }));
  const queue = [startIndex];
  const seen = new Set<number>();

  while (queue.length > 0) {
    const index = queue.shift()!;
    const cell = next[index];

    if (seen.has(index) || cell.flagged || cell.mine) {
      continue;
    }

    seen.add(index);
    cell.revealed = true;

    if (cell.adjacent === 0) {
      mineNeighbors(index).forEach((neighbor) => {
        if (!seen.has(neighbor) && !next[neighbor].revealed) {
          queue.push(neighbor);
        }
      });
    }
  }

  return next;
}

function revealMineCell(board: MineCell[], index: number) {
  const cell = board[index];

  if (cell.revealed || cell.flagged) {
    return { board, hitMine: false };
  }

  if (cell.mine) {
    return { board: revealMines(board), hitMine: true };
  }

  return { board: floodReveal(board, index), hitMine: false };
}

function boardIsWon(board: MineCell[]) {
  return board.every((cell) => cell.mine || cell.revealed);
}

function randomMatchKind(kinds: MatchKind[]) {
  return kinds[Math.floor(Math.random() * kinds.length)] ?? kinds[0];
}

function randomMatchKindForPosition(kinds: MatchKind[], board: MatchBoard, row: number, col: number) {
  const shuffled = [...kinds].sort(() => Math.random() - 0.5);
  const validKinds = shuffled.filter((kind) => {
    const makesHorizontal =
      col >= 2 &&
      board[matchIndex(row, col - 1)]?.kind === kind &&
      board[matchIndex(row, col - 2)]?.kind === kind;
    const makesVertical =
      row >= 2 &&
      board[matchIndex(row - 1, col)]?.kind === kind &&
      board[matchIndex(row - 2, col)]?.kind === kind;

    return !makesHorizontal && !makesVertical;
  });

  return validKinds[0] ?? randomMatchKind(kinds);
}

let matchTileId = 0;

function createMatchTile(kind: MatchKind, special?: MatchSpecial): MatchTile {
  matchTileId += 1;
  return { id: matchTileId, kind, special };
}

function createMatchBoard(kinds: MatchKind[]) {
  const board: MatchTile[] = [];

  for (let row = 0; row < MATCH_SIZE; row += 1) {
    for (let col = 0; col < MATCH_SIZE; col += 1) {
      board[matchIndex(row, col)] = createMatchTile(
        randomMatchKindForPosition(kinds, board, row, col),
      );
    }
  }

  return board;
}

function createStableMatchBoard(kinds: MatchKind[]) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const board = createMatchBoard(kinds);

    if (findPossibleMatchSwap(board)) {
      return board;
    }
  }

  return stabilizePlayableMatchBoard(createMatchBoard(kinds), kinds);
}

function matchSpecialsDebugEnabled() {
  return new URLSearchParams(window.location.search).has("matchSpecials");
}

function createMatchGameBoard(kinds: MatchKind[]) {
  const board = createStableMatchBoard(kinds);

  if (!matchSpecialsDebugEnabled()) {
    return board;
  }

  const debugTiles: Array<{ index: number; kind: MatchKind; special: MatchSpecial }> = [
    { index: matchIndex(2, 2), kind: kinds[0] ?? "kanshan", special: "bomb" },
    { index: matchIndex(2, 3), kind: kinds[1] ?? "petal", special: "row" },
    { index: matchIndex(3, 2), kind: kinds[2] ?? "question", special: "col" },
    { index: matchIndex(3, 3), kind: kinds[3] ?? "orb", special: "rainbow" },
  ];

  debugTiles.forEach(({ index, kind, special }) => {
    board[index] = createMatchTile(kind, special);
  });

  return board;
}

function matchIndex(row: number, col: number) {
  return row * MATCH_SIZE + col;
}

function matchableKind(tile: MatchTile | null | undefined, protectedSpecialIds = new Set<number>()) {
  if (!tile || tile.special || protectedSpecialIds.has(tile.id)) {
    return undefined;
  }

  return tile.kind;
}

function mergeMatchGroups(
  groups: {
    kind: MatchKind;
    indexes: Set<number>;
    orientations: Set<"horizontal" | "vertical">;
  }[],
) {
  const merged = groups.map((group) => ({
    kind: group.kind,
    indexes: new Set(group.indexes),
    orientations: new Set(group.orientations),
  }));

  let changed = true;

  while (changed) {
    changed = false;

    for (let outer = 0; outer < merged.length; outer += 1) {
      for (let inner = outer + 1; inner < merged.length; inner += 1) {
        const a = merged[outer];
        const b = merged[inner];
        const overlaps = [...a.indexes].some((index) => b.indexes.has(index));

        if (a.kind === b.kind && overlaps) {
          b.indexes.forEach((index) => a.indexes.add(index));
          b.orientations.forEach((orientation) => a.orientations.add(orientation));
          merged.splice(inner, 1);
          changed = true;
          break;
        }
      }

      if (changed) {
        break;
      }
    }
  }

  return merged;
}

function findMatchGroups(board: MatchBoard, protectedSpecialIds = new Set<number>()) {
  const rawGroups: {
    kind: MatchKind;
    indexes: Set<number>;
    orientations: Set<"horizontal" | "vertical">;
  }[] = [];

  for (let row = 0; row < MATCH_SIZE; row += 1) {
    let runStart = 0;

    for (let col = 1; col <= MATCH_SIZE; col += 1) {
      const current = col < MATCH_SIZE ? matchableKind(board[matchIndex(row, col)], protectedSpecialIds) : undefined;
      const previous = matchableKind(board[matchIndex(row, col - 1)], protectedSpecialIds);

      if (current !== previous) {
        if (previous && col - runStart >= 3) {
          const indexes = new Set<number>();

          for (let fill = runStart; fill < col; fill += 1) {
            indexes.add(matchIndex(row, fill));
          }

          rawGroups.push({
            kind: previous,
            indexes,
            orientations: new Set(["horizontal"]),
          });
        }

        runStart = col;
      }
    }
  }

  for (let col = 0; col < MATCH_SIZE; col += 1) {
    let runStart = 0;

    for (let row = 1; row <= MATCH_SIZE; row += 1) {
      const current = row < MATCH_SIZE ? matchableKind(board[matchIndex(row, col)], protectedSpecialIds) : undefined;
      const previous = matchableKind(board[matchIndex(row - 1, col)], protectedSpecialIds);

      if (current !== previous) {
        if (previous && row - runStart >= 3) {
          const indexes = new Set<number>();

          for (let fill = runStart; fill < row; fill += 1) {
            indexes.add(matchIndex(fill, col));
          }

          rawGroups.push({
            kind: previous,
            indexes,
            orientations: new Set(["vertical"]),
          });
        }

        runStart = row;
      }
    }
  }

  return mergeMatchGroups(rawGroups);
}

function indexesAreAdjacent(a: number, b: number) {
  const aRow = Math.floor(a / MATCH_SIZE);
  const aCol = a % MATCH_SIZE;
  const bRow = Math.floor(b / MATCH_SIZE);
  const bCol = b % MATCH_SIZE;

  return Math.abs(aRow - bRow) + Math.abs(aCol - bCol) === 1;
}

function adjacentIndexFromDelta(index: number, deltaX: number, deltaY: number) {
  const row = Math.floor(index / MATCH_SIZE);
  const col = index % MATCH_SIZE;
  const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
  const nextRow = horizontal ? row : row + (deltaY > 0 ? 1 : -1);
  const nextCol = horizontal ? col + (deltaX > 0 ? 1 : -1) : col;

  if (nextRow < 0 || nextRow >= MATCH_SIZE || nextCol < 0 || nextCol >= MATCH_SIZE) {
    return null;
  }

  return matchIndex(nextRow, nextCol);
}

function matchRow(index: number) {
  return Math.floor(index / MATCH_SIZE);
}

function matchCol(index: number) {
  return index % MATCH_SIZE;
}

function matchBoardIsComplete(board: MatchBoard): board is MatchTile[] {
  return board.every(Boolean);
}

function matchTileIdSet(board: MatchBoard) {
  return new Set(board.flatMap((tile) => (tile ? [tile.id] : [])));
}

function freshMatchTileIds(previousIds: Set<number>, board: MatchBoard) {
  return new Set(
    board.flatMap((tile) => (tile && !previousIds.has(tile.id) ? [tile.id] : [])),
  );
}

function matchTileIndexMap(board: MatchBoard) {
  const indexes = new Map<number, number>();

  board.forEach((tile, index) => {
    if (tile) {
      indexes.set(tile.id, index);
    }
  });

  return indexes;
}

function matchTileSlideMotions(previousBoard: MatchBoard, board: MatchBoard, freshIds: Set<number>) {
  const previousIndexes = matchTileIndexMap(previousBoard);
  const motions = new Map<number, Point>();

  board.forEach((tile, index) => {
    if (!tile || freshIds.has(tile.id)) {
      return;
    }

    const previousIndex = previousIndexes.get(tile.id);

    if (previousIndex === undefined || previousIndex === index) {
      return;
    }

    motions.set(tile.id, {
      x: matchCol(previousIndex) - matchCol(index),
      y: matchRow(previousIndex) - matchRow(index),
    });
  });

  return motions;
}

function addMatchRow(cleared: Set<number>, row: number) {
  if (row < 0 || row >= MATCH_SIZE) {
    return;
  }

  for (let col = 0; col < MATCH_SIZE; col += 1) {
    cleared.add(matchIndex(row, col));
  }
}

function addMatchCol(cleared: Set<number>, col: number) {
  if (col < 0 || col >= MATCH_SIZE) {
    return;
  }

  for (let row = 0; row < MATCH_SIZE; row += 1) {
    cleared.add(matchIndex(row, col));
  }
}

function addMatchArea(cleared: Set<number>, center: number, radius: number) {
  const row = matchRow(center);
  const col = matchCol(center);

  for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
    for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (
        nextRow >= 0 &&
        nextRow < MATCH_SIZE &&
        nextCol >= 0 &&
        nextCol < MATCH_SIZE
      ) {
        cleared.add(matchIndex(nextRow, nextCol));
      }
    }
  }
}

function mostCommonMatchKind(board: MatchBoard) {
  const counts = new Map<MatchKind, number>();

  board.forEach((tile) => {
    if (tile) {
      counts.set(tile.kind, (counts.get(tile.kind) ?? 0) + 1);
    }
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "kanshan";
}

function swapMatchTiles(board: MatchTile[], a: number, b: number) {
  const next = [...board];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function findPossibleMatchSwap(board: MatchBoard) {
  if (!matchBoardIsComplete(board)) {
    return null;
  }

  for (let row = 0; row < MATCH_SIZE; row += 1) {
    for (let col = 0; col < MATCH_SIZE; col += 1) {
      const index = matchIndex(row, col);
      const targets = [
        col < MATCH_SIZE - 1 ? matchIndex(row, col + 1) : null,
        row < MATCH_SIZE - 1 ? matchIndex(row + 1, col) : null,
      ];

      for (const target of targets) {
        if (target === null) {
          continue;
        }

        const candidate = swapMatchTiles(board, index, target);

        if (findMatchGroups(candidate).length > 0) {
          return { first: index, second: target };
        }
      }
    }
  }

  return null;
}

function boardHasUsableSpecial(board: MatchBoard) {
  return board.some((tile) => Boolean(tile?.special));
}

function stabilizePlayableMatchBoard(board: MatchTile[], kinds: MatchKind[]) {
  if (findMatchGroups(board).length === 0 && findPossibleMatchSwap(board)) {
    return board;
  }

  const fillerKinds: MatchKind[] = kinds.length > 1 ? kinds : [...MATCH_KINDS];

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const candidate = [...board];
    const row = Math.floor(Math.random() * (MATCH_SIZE - 1));
    const col = Math.floor(Math.random() * (MATCH_SIZE - 2));
    const kind = fillerKinds[attempt % fillerKinds.length];
    const otherKind = fillerKinds.find((item) => item !== kind) ?? kind;

    candidate[matchIndex(row, col)] = createMatchTile(kind);
    candidate[matchIndex(row, col + 1)] = createMatchTile(kind);
    candidate[matchIndex(row, col + 2)] = createMatchTile(otherKind);
    candidate[matchIndex(row + 1, col + 2)] = createMatchTile(kind);

    if (findMatchGroups(candidate).length === 0 && findPossibleMatchSwap(candidate)) {
      return candidate;
    }
  }

  return board;
}

function reshufflePlayableMatchBoard(board: MatchBoard, kinds: MatchKind[]) {
  if (!matchBoardIsComplete(board)) {
    return createStableMatchBoard(kinds);
  }

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const candidate = shuffleList(board);

    if (findMatchGroups(candidate).length === 0 && findPossibleMatchSwap(candidate)) {
      return candidate;
    }
  }

  return createStableMatchBoard(kinds);
}

function specialForGroup(
  group: {
    indexes: Set<number>;
    orientations: Set<"horizontal" | "vertical">;
  },
): MatchSpecial | undefined {
  const size = group.indexes.size;
  const isTurn = group.orientations.size > 1;

  if (size >= 5 && isTurn) {
    return "bomb";
  }

  if (size >= 5) {
    return "rainbow";
  }

  if (size === 4) {
    return group.orientations.has("horizontal") ? "row" : "col";
  }

  return undefined;
}

function chooseSpecialIndex(group: { indexes: Set<number> }, preferredIndex?: number) {
  if (preferredIndex !== undefined && group.indexes.has(preferredIndex)) {
    return preferredIndex;
  }

  return [...group.indexes][Math.floor(group.indexes.size / 2)];
}

function collectSpecialEffect(
  board: MatchBoard,
  index: number,
  targetKind?: MatchKind,
  visited = new Set<number>(),
) {
  if (visited.has(index)) {
    return new Set<number>();
  }

  visited.add(index);

  const tile = board[index];
  const cleared = new Set<number>();

  if (!tile) {
    return cleared;
  }

  cleared.add(index);

  if (!tile.special) {
    return cleared;
  }

  const row = matchRow(index);
  const col = matchCol(index);

  if (tile.special === "row") {
    addMatchRow(cleared, row);
  }

  if (tile.special === "col") {
    addMatchCol(cleared, col);
  }

  if (tile.special === "bomb") {
    addMatchArea(cleared, index, 1);
  }

  if (tile.special === "rainbow") {
    const kindToClear = targetKind ?? tile.kind;

    board.forEach((candidate, candidateIndex) => {
      if (candidate?.kind === kindToClear) {
        cleared.add(candidateIndex);
      }
    });
  }

  [...cleared].forEach((clearedIndex) => {
    const chainedTile = board[clearedIndex];

    if (chainedTile?.special && clearedIndex !== index) {
      collectSpecialEffect(board, clearedIndex, targetKind, visited).forEach((nextIndex) =>
        cleared.add(nextIndex),
      );
    }
  });

  return cleared;
}

function collectSpecialComboEffect(board: MatchTile[], first: number, second: number) {
  const firstTile = board[first];
  const secondTile = board[second];
  const cleared = new Set<number>([first, second]);

  if (!firstTile.special && !secondTile.special) {
    return cleared;
  }

  const rainbowIndex =
    firstTile.special === "rainbow" ? first : secondTile.special === "rainbow" ? second : null;
  const otherIndex = rainbowIndex === first ? second : first;
  const otherTile = board[otherIndex];

  if (firstTile.special === "rainbow" && secondTile.special === "rainbow") {
    board.forEach((_, index) => cleared.add(index));
    return cleared;
  }

  if (rainbowIndex !== null) {
    const targetKind = otherTile.kind;

    board.forEach((tile, index) => {
      if (tile.kind !== targetKind) {
        return;
      }

      cleared.add(index);

      if (otherTile.special === "row") {
        addMatchRow(cleared, matchRow(index));
      } else if (otherTile.special === "col") {
        addMatchCol(cleared, matchCol(index));
      } else if (otherTile.special === "bomb") {
        addMatchArea(cleared, index, 1);
      }
    });

    return cleared;
  }

  if (firstTile.special === "bomb" && secondTile.special === "bomb") {
    addMatchArea(cleared, first, 2);
    addMatchArea(cleared, second, 2);
    return cleared;
  }

  const stripedBomb =
    firstTile.special === "bomb" && (secondTile.special === "row" || secondTile.special === "col")
      ? second
      : secondTile.special === "bomb" && (firstTile.special === "row" || firstTile.special === "col")
        ? first
        : null;

  if (stripedBomb !== null) {
    const row = matchRow(stripedBomb);
    const col = matchCol(stripedBomb);

    [-1, 0, 1].forEach((offset) => {
      addMatchRow(cleared, row + offset);
      addMatchCol(cleared, col + offset);
    });

    return cleared;
  }

  [first, second].forEach((index) => {
    const special = board[index].special;

    if (special === "row") {
      addMatchRow(cleared, matchRow(index));
    }
    if (special === "col") {
      addMatchCol(cleared, matchCol(index));
    }
    if (special === "bomb") {
      addMatchArea(cleared, index, 1);
    }
  });

  return cleared;
}

function uniqueMatchSpecials(specials: Array<MatchSpecial | undefined>) {
  return specials.filter((special, index, list): special is MatchSpecial =>
    Boolean(special) && list.indexOf(special) === index,
  );
}

function fullMatchRows(indexes: number[]) {
  const counts = new Map<number, number>();

  indexes.forEach((index) => {
    const row = matchRow(index);
    counts.set(row, (counts.get(row) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count >= MATCH_SIZE)
    .map(([row]) => row);
}

function fullMatchCols(indexes: number[]) {
  const counts = new Map<number, number>();

  indexes.forEach((index) => {
    const col = matchCol(index);
    counts.set(col, (counts.get(col) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count >= MATCH_SIZE)
    .map(([col]) => col);
}

function collapseMatchBoard(board: MatchTile[], matched: Set<number>, kinds: MatchKind[]) {
  const next = [...board];

  for (let col = 0; col < MATCH_SIZE; col += 1) {
    const survivors: MatchTile[] = [];

    for (let row = MATCH_SIZE - 1; row >= 0; row -= 1) {
      const index = matchIndex(row, col);

      const tile = next[index];

      if (tile && !matched.has(index)) {
        survivors.push(tile);
      }
    }

    for (let row = MATCH_SIZE - 1; row >= 0; row -= 1) {
      const value = survivors.shift() ?? createMatchTile(randomMatchKind(kinds));
      next[matchIndex(row, col)] = value;
    }
  }

  return next;
}

function resolveMatchBoard(board: MatchTile[], kinds: MatchKind[], preferredIndex?: number) {
  let next = [...board];
  let gained = 0;
  let cascades = 0;
  let createdSpecials = 0;
  const stages: MatchBoard[] = [];
  const protectedSpecialIds = new Set<number>();

  while (cascades < 8) {
    const groups = findMatchGroups(next, protectedSpecialIds);

    if (groups.length === 0) {
      break;
    }

    cascades += 1;
    const cleared = new Set<number>();
    const creations: { index: number; tile: MatchTile }[] = [];

    groups.forEach((group) => {
      const special = specialForGroup(group);
      const createIndex = special ? chooseSpecialIndex(group, preferredIndex) : undefined;

      group.indexes.forEach((index) => {
        cleared.add(index);

        if (next[index].special) {
          collectSpecialEffect(next, index).forEach((effectIndex) => cleared.add(effectIndex));
        }
      });

      if (special && createIndex !== undefined) {
        creations.push({ index: createIndex, tile: createMatchTile(group.kind, special) });
        createdSpecials += 1;
      }
    });

    cleared.forEach((index) => {
      const tile = next[index];

      if (tile?.special && protectedSpecialIds.has(tile.id)) {
        cleared.delete(index);
      }
    });

    gained += cleared.size * 12 * cascades + creations.length * 40;
    stages.push(next.map((tile, index) => (cleared.has(index) ? null : tile)));
    next = collapseMatchBoard(next, cleared, kinds);
    creations.forEach((creation) => {
      next[creation.index] = creation.tile;
    });
    stages.push([...next]);
    creations.forEach((creation) => protectedSpecialIds.add(creation.tile.id));
  }

  return {
    board: next,
    gained,
    cascades,
    createdSpecials,
    stages,
  };
}

let linkTileId = 0;
let linkPairId = 0;

function createLinkCell(kind: MatchKind, pairId: number, side: LinkSide): LinkCell {
  const copy = LINK_PAIR_COPY[kind];

  linkTileId += 1;
  return {
    id: linkTileId,
    pairId,
    kind,
    side,
    text: side === "question" ? copy.question : copy.answer,
    removed: false,
  };
}

function linkIndex(row: number, col: number) {
  return row * LINK_COLS + col;
}

function linkCoords(index: number) {
  return {
    row: Math.floor(index / LINK_COLS),
    col: index % LINK_COLS,
  };
}

function shuffleList<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createLinkBoard(kinds: MatchKind[]) {
  const pairCount = (LINK_ROWS * LINK_COLS) / 2;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const cells = shuffleList(
      Array.from({ length: pairCount }, (_, index) => {
        linkPairId += 1;
        const kind = kinds[index % kinds.length];

        return [
          createLinkCell(kind, linkPairId, "question"),
          createLinkCell(kind, linkPairId, "answer"),
        ];
      }).flat(),
    );

    if (findAvailableLinkPair(cells)) {
      return cells;
    }
  }

  return shuffleList(
    Array.from({ length: pairCount }, (_, index) => {
      linkPairId += 1;
      const kind = kinds[index % kinds.length];

      return [
        createLinkCell(kind, linkPairId, "question"),
        createLinkCell(kind, linkPairId, "answer"),
      ];
    }).flat(),
  );
}

function shuffleRemainingLinkBoard(board: LinkCell[]) {
  const remainingCells = board.filter((cell) => !cell.removed);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const shuffledCells = shuffleList(remainingCells);
    let cursor = 0;
    const next = board.map((cell) => {
      if (cell.removed) {
        return cell;
      }

      const shuffledCell = shuffledCells[cursor] ?? cell;
      cursor += 1;
      return createLinkCell(shuffledCell.kind, shuffledCell.pairId, shuffledCell.side);
    });

    if (!next.some((cell) => !cell.removed) || findAvailableLinkPair(next)) {
      return next;
    }
  }

  return board;
}

function linkCellsCanPair(first: LinkCell, second: LinkCell) {
  return (
    !first.removed &&
    !second.removed &&
    first.kind === second.kind &&
    first.side !== second.side
  );
}

function linkSearchInBounds(row: number, col: number) {
  return row >= -1 && row <= LINK_ROWS && col >= -1 && col <= LINK_COLS;
}

function linkCellIsOpen(board: LinkCell[], row: number, col: number, start: number, target: number) {
  if (row < 0 || row >= LINK_ROWS || col < 0 || col >= LINK_COLS) {
    return true;
  }

  const index = linkIndex(row, col);
  return index === start || index === target || board[index]?.removed;
}

function findLinkPath(board: LinkCell[], start: number, target: number) {
  const startCell = board[start];
  const targetCell = board[target];

  if (
    start === target ||
    !startCell ||
    !targetCell ||
    startCell.removed ||
    targetCell.removed ||
    !linkCellsCanPair(startCell, targetCell)
  ) {
    return null;
  }

  const directions = [
    { row: -1, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
  ];
  const startPoint = linkCoords(start);
  const targetPoint = linkCoords(target);
  const queue: {
    row: number;
    col: number;
    direction: number | null;
    turns: number;
    path: Point[];
  }[] = [{ ...startPoint, direction: null, turns: 0, path: [{ x: startPoint.col, y: startPoint.row }] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
      const direction = directions[directionIndex];
      const nextRow = current.row + direction.row;
      const nextCol = current.col + direction.col;
      const nextTurns =
        current.direction === null || current.direction === directionIndex
          ? current.turns
          : current.turns + 1;

      if (
        nextTurns > 2 ||
        !linkSearchInBounds(nextRow, nextCol) ||
        !linkCellIsOpen(board, nextRow, nextCol, start, target)
      ) {
        continue;
      }

      const key = `${nextRow},${nextCol},${directionIndex},${nextTurns}`;

      if (visited.has(key)) {
        continue;
      }

      const path = [...current.path, { x: nextCol, y: nextRow }];

      if (nextRow === targetPoint.row && nextCol === targetPoint.col) {
        return path;
      }

      visited.add(key);
      queue.push({
        row: nextRow,
        col: nextCol,
        direction: directionIndex,
        turns: nextTurns,
        path,
      });
    }
  }

  return null;
}

function findAvailableLinkPair(board: LinkCell[]) {
  for (let first = 0; first < board.length; first += 1) {
    if (board[first].removed) {
      continue;
    }

    for (let second = first + 1; second < board.length; second += 1) {
      if (linkCellsCanPair(board[first], board[second])) {
        const path = findLinkPath(board, first, second);

        if (path) {
          return { first, second, path };
        }
      }
    }
  }

  return null;
}

let bubbleTileId = 0;

function createBubbleCell(kind: MatchKind): BubbleCell {
  bubbleTileId += 1;
  return { id: bubbleTileId, kind };
}

function bubbleIndex(row: number, col: number) {
  return row * BUBBLE_COLS + col;
}

function bubbleCoords(index: number) {
  return {
    row: Math.floor(index / BUBBLE_COLS),
    col: index % BUBBLE_COLS,
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function bubbleSlotIsPlayable(row: number, col: number) {
  return (
    row >= 0 &&
    row < BUBBLE_ROWS &&
    col >= 0 &&
    col < BUBBLE_COLS &&
    !(row % 2 === 1 && col === BUBBLE_COLS - 1)
  );
}

function bubbleCenter(row: number, col: number): Point {
  return {
    x: col + (row % 2 === 1 ? 0.5 : 0),
    y: row * BUBBLE_ROW_STEP,
  };
}

function bubbleCenterForIndex(index: number) {
  const { row, col } = bubbleCoords(index);
  return bubbleCenter(row, col);
}

function bubbleCannonOrigin(): Point {
  return {
    x: BUBBLE_CANNON_X,
    y: (BUBBLE_ROWS + 0.18) * BUBBLE_ROW_STEP,
  };
}

function bubbleDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bubblePathDistance(path: Point[]) {
  let distance = 0;

  for (let index = 1; index < path.length; index += 1) {
    distance += bubbleDistance(path[index - 1], path[index]);
  }

  return distance;
}

function bubblePointAlongPath(path: Point[], distance: number) {
  if (path.length === 0) {
    return bubbleCannonOrigin();
  }

  let remaining = distance;

  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const segmentLength = bubbleDistance(start, end);

    if (segmentLength === 0) {
      continue;
    }

    if (remaining <= segmentLength) {
      const t = remaining / segmentLength;

      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      };
    }

    remaining -= segmentLength;
  }

  return path[path.length - 1];
}

function distanceToBubbleTrace(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return bubbleDistance(point, start);
  }

  const t = clampValue(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    0,
    1,
  );
  const closest = {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };

  return bubbleDistance(point, closest);
}

function randomBubbleKind(kinds: MatchKind[]) {
  return kinds[Math.floor(Math.random() * kinds.length)] ?? kinds[0];
}

function createBubbleBoard(kinds: MatchKind[], filledRows: number) {
  const board: Array<BubbleCell | null> = Array.from(
    { length: BUBBLE_ROWS * BUBBLE_COLS },
    () => null,
  );

  for (let row = 0; row < filledRows; row += 1) {
    for (let col = 0; col < BUBBLE_COLS; col += 1) {
      if (bubbleSlotIsPlayable(row, col) && Math.random() > 0.08) {
        board[bubbleIndex(row, col)] = createBubbleCell(randomBubbleKind(kinds));
      }
    }
  }

  return board;
}

function bubbleNeighbors(index: number) {
  const { row, col } = bubbleCoords(index);
  const diagonalOffsets =
    row % 2 === 0
      ? [
          [-1, -1],
          [-1, 0],
          [1, -1],
          [1, 0],
        ]
      : [
          [-1, 0],
          [-1, 1],
          [1, 0],
          [1, 1],
        ];
  const offsets = [
    [0, -1],
    [0, 1],
    ...diagonalOffsets,
  ];

  return offsets
    .map(([rowOffset, colOffset]) => ({ row: row + rowOffset, col: col + colOffset }))
    .filter(({ row: nextRow, col: nextCol }) => bubbleSlotIsPlayable(nextRow, nextCol))
    .map(({ row: nextRow, col: nextCol }) => bubbleIndex(nextRow, nextCol));
}

function findBubbleCluster(board: Array<BubbleCell | null>, start: number) {
  const startCell = board[start];

  if (!startCell) {
    return new Set<number>();
  }

  const cluster = new Set<number>([start]);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === undefined) {
      break;
    }

    bubbleNeighbors(current).forEach((neighbor) => {
      const neighborCell = board[neighbor];

      if (neighborCell && neighborCell.kind === startCell.kind && !cluster.has(neighbor)) {
        cluster.add(neighbor);
        queue.push(neighbor);
      }
    });
  }

  return cluster;
}

function findCeilingConnectedBubbles(board: Array<BubbleCell | null>) {
  const connected = new Set<number>();
  const queue: number[] = [];

  for (let col = 0; col < BUBBLE_COLS; col += 1) {
    const index = bubbleIndex(0, col);

    if (board[index]) {
      connected.add(index);
      queue.push(index);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === undefined) {
      break;
    }

    bubbleNeighbors(current).forEach((neighbor) => {
      if (board[neighbor] && !connected.has(neighbor)) {
        connected.add(neighbor);
        queue.push(neighbor);
      }
    });
  }

  return connected;
}

function createBubblePlacement(
  board: Array<BubbleCell | null>,
  index: number,
  kind: MatchKind,
  path = [bubbleCannonOrigin(), bubbleCenterForIndex(index)],
) {
  const target = bubbleCenterForIndex(index);
  const finalPath = [...path];

  if (bubbleDistance(finalPath[finalPath.length - 1], target) > 0.001) {
    finalPath.push(target);
  }

  return {
    index,
    board: board.map((cell, cellIndex) =>
      cellIndex === index ? createBubbleCell(kind) : cell,
    ),
    distance: bubblePathDistance(finalPath),
    path: finalPath,
  };
}

function nearestEmptyBubbleIndex(
  board: Array<BubbleCell | null>,
  point: Point,
  topOnly = false,
) {
  const candidates = board.flatMap((cell, index) => {
    const { row, col } = bubbleCoords(index);

    if (cell || !bubbleSlotIsPlayable(row, col) || (topOnly && row !== 0)) {
      return [];
    }

    return [index];
  });

  return candidates.sort(
    (a, b) => bubbleDistance(bubbleCenterForIndex(a), point) - bubbleDistance(bubbleCenterForIndex(b), point),
  )[0] ?? null;
}

function bubbleLandingNearImpact(
  board: Array<BubbleCell | null>,
  impactIndex: number,
  point: Point,
) {
  const candidates = bubbleNeighbors(impactIndex).filter((index) => !board[index]);

  if (candidates.length === 0) {
    return nearestEmptyBubbleIndex(board, point);
  }

  return candidates.sort(
    (a, b) => bubbleDistance(bubbleCenterForIndex(a), point) - bubbleDistance(bubbleCenterForIndex(b), point),
  )[0] ?? null;
}

function traceBubbleShot(board: Array<BubbleCell | null>, angle: number, kind: MatchKind) {
  if (!board.some((cell, index) => {
    const { row, col } = bubbleCoords(index);
    return !cell && bubbleSlotIsPlayable(row, col);
  })) {
    return null;
  }

  const origin = bubbleCannonOrigin();
  const radians = (clampValue(angle, -BUBBLE_AIM_LIMIT, BUBBLE_AIM_LIMIT) * Math.PI) / 180;
  const direction = {
    x: Math.sin(radians),
    y: -Math.cos(radians),
  };
  const position = { ...origin };
  const leftWall = -0.44;
  const rightWall = BUBBLE_COLS - 1 + 0.44;
  const occupied = board.flatMap((cell, index) => (cell ? [{ index, center: bubbleCenterForIndex(index) }] : []));
  const path: Point[] = [{ ...origin }];

  for (let step = 0; step < 980; step += 1) {
    const previousPosition = { ...position };
    let segmentStart = previousPosition;

    position.x += direction.x * BUBBLE_TRACE_STEP;
    position.y += direction.y * BUBBLE_TRACE_STEP;

    if (position.x <= leftWall) {
      const wallPoint = { x: leftWall, y: position.y };
      path.push(wallPoint);
      segmentStart = wallPoint;
      position.x = leftWall + (leftWall - position.x);
      direction.x *= -1;
    }

    if (position.x >= rightWall) {
      const wallPoint = { x: rightWall, y: position.y };
      path.push(wallPoint);
      segmentStart = wallPoint;
      position.x = rightWall - (position.x - rightWall);
      direction.x *= -1;
    }

    if (position.y <= -0.38) {
      const topIndex = nearestEmptyBubbleIndex(board, { x: position.x, y: 0 }, true);
      const fallbackIndex = topIndex ?? nearestEmptyBubbleIndex(board, { x: position.x, y: 0 });
      return fallbackIndex === null ? null : createBubblePlacement(board, fallbackIndex, kind, [
        ...path,
        { x: position.x, y: 0 },
      ]);
    }

    const impact = occupied
      .map((bubble) => ({
        ...bubble,
        distance: distanceToBubbleTrace(bubble.center, segmentStart, position),
      }))
      .filter(({ distance }) => distance <= BUBBLE_COLLISION_RADIUS)
      .sort((a, b) => a.distance - b.distance)[0];

    if (impact) {
      const landingIndex = bubbleLandingNearImpact(board, impact.index, position);
      return landingIndex === null ? null : createBubblePlacement(board, landingIndex, kind, [
        ...path,
        { ...position },
      ]);
    }
  }

  const fallbackIndex = nearestEmptyBubbleIndex(board, position);
  return fallbackIndex === null ? null : createBubblePlacement(board, fallbackIndex, kind, [
    ...path,
    { ...position },
  ]);
}

function bubbleBoardTouchesKillLine(board: Array<BubbleCell | null>) {
  return board.some((cell, index) => cell && bubbleCoords(index).row >= BUBBLE_KILL_ROW);
}

function resolveBubbleShot(board: Array<BubbleCell | null>, landingIndex: number) {
  const next = [...board];
  const cluster = findBubbleCluster(next, landingIndex);
  let popped = 0;
  let dropped = 0;

  if (cluster.size >= 3) {
    cluster.forEach((index) => {
      next[index] = null;
    });
    popped = cluster.size;

    const ceilingConnected = findCeilingConnectedBubbles(next);

    next.forEach((cell, index) => {
      if (cell && !ceilingConnected.has(index)) {
        next[index] = null;
        dropped += 1;
      }
    });
  }

  return {
    board: next,
    popped,
    dropped,
  };
}

function snakeConnections(point: Point, snake: Point[], index: number) {
  if (index < 0) {
    return [];
  }

  const adjacent: Point[] = [];
  const previous = snake[index - 1];
  const next = snake[index + 1];

  if (previous) {
    adjacent.push(previous);
  }

  if (next) {
    adjacent.push(next);
  }
  const connections: DirectionName[] = [];

  adjacent.forEach((part) => {
    if (part.x === point.x && part.y === point.y - 1) {
      connections.push("up");
    }
    if (part.x === point.x && part.y === point.y + 1) {
      connections.push("down");
    }
    if (part.x === point.x - 1 && part.y === point.y) {
      connections.push("left");
    }
    if (part.x === point.x + 1 && part.y === point.y) {
      connections.push("right");
    }
  });

  return Array.from(new Set(connections));
}

function screenFromLocation(): Screen {
  const hash = window.location.hash.replace(/^#/, "");

  if (
    hash === "snake" ||
    hash === "minesweeper" ||
    hash === "solitaire" ||
    hash === "match" ||
    hash === "link" ||
    hash === "bubble" ||
    hash === "fishing"
  ) {
    return hash;
  }

  return "hub";
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => screenFromLocation());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);

  const navigateTo = useCallback((nextScreen: Screen, mode: "push" | "replace" = "push") => {
    const hash = nextScreen === "hub" ? "" : `#${nextScreen}`;
    const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;

    setScreen(nextScreen);

    if (`${window.location.pathname}${window.location.search}${window.location.hash}` === nextUrl) {
      return;
    }

    if (mode === "replace") {
      window.history.replaceState({ screen: nextScreen }, "", nextUrl);
      return;
    }

    window.history.pushState({ screen: nextScreen }, "", nextUrl);
  }, []);

  useEffect(() => {
    const syncFromHistory = () => setScreen(screenFromLocation());

    window.addEventListener("popstate", syncFromHistory);
    window.addEventListener("hashchange", syncFromHistory);
    return () => {
      window.removeEventListener("popstate", syncFromHistory);
      window.removeEventListener("hashchange", syncFromHistory);
    };
  }, []);

  const playTone = useCallback<GameTone>(
    (frequency = 520, duration = 0.07, type = "sine") => {
      if (!soundEnabled) {
        return;
      }

      const AudioCtor =
        window.AudioContext ??
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioCtor) {
        return;
      }

      const context = audioContext.current ?? new AudioCtor();
      audioContext.current = context;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration + 0.02);
    },
    [soundEnabled],
  );

  return (
    <main className={`app-shell ${screen === "hub" ? "app-shell--hub" : "app-shell--game"}`}>
      <TopBar
        soundEnabled={soundEnabled}
        onSoundToggle={() => {
          setSoundEnabled((value) => !value);
          playTone(680, 0.05, "triangle");
        }}
        onHome={() => navigateTo("hub", "replace")}
        showHome={screen !== "hub"}
      />

      {screen === "hub" && <Hub onSelect={(nextScreen) => navigateTo(nextScreen)} />}
      {screen === "snake" && (
        <SnakeGame onBack={() => navigateTo("hub", "replace")} playTone={playTone} />
      )}
      {screen === "minesweeper" && (
        <MinesweeperGame onBack={() => navigateTo("hub", "replace")} playTone={playTone} />
      )}
      {screen === "solitaire" && (
        <SolitaireGame onBack={() => navigateTo("hub", "replace")} playTone={playTone} />
      )}
      {screen === "match" && (
        <MatchGame onBack={() => navigateTo("hub", "replace")} playTone={playTone} />
      )}
      {screen === "link" && (
        <LinkGame onBack={() => navigateTo("hub", "replace")} playTone={playTone} />
      )}
      {screen === "bubble" && (
        <BubbleGame onBack={() => navigateTo("hub", "replace")} playTone={playTone} />
      )}
      {screen === "fishing" && (
        <FishingGame onBack={() => navigateTo("hub", "replace")} playTone={playTone} />
      )}
    </main>
  );
}

function TopBar({
  soundEnabled,
  showHome,
  onSoundToggle,
  onHome,
}: {
  soundEnabled: boolean;
  showHome: boolean;
  onSoundToggle: () => void;
  onHome: () => void;
}) {
  return (
    <header className="top-bar">
      <button
        className="brand-button"
        type="button"
        onClick={onHome}
        aria-label="返回大厅"
      >
        <span className="brand-mark" />
        <span>刘看山小游戏乐园</span>
      </button>

      <div className="top-actions">
        {showHome && (
          <button
            className="icon-button"
            type="button"
            onClick={onHome}
            aria-label="返回大厅"
            title="返回大厅"
          >
            <Home size={20} />
          </button>
        )}
        <button
          className="icon-button"
          type="button"
          onClick={onSoundToggle}
          aria-label={soundEnabled ? "关闭音效" : "开启音效"}
          title={soundEnabled ? "关闭音效" : "开启音效"}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
    </header>
  );
}

function Hub({ onSelect }: { onSelect: (screen: Screen) => void }) {
  const games = [
    {
      id: "snake",
      title: "贪吃刘看山",
      label: "已开放",
      accent: "#1b9a7a",
      image: ASSETS.snakeCover,
      icon: <Gamepad2 size={22} />,
    },
    {
      id: "minesweeper",
      title: "花园扫雷",
      label: "已开放",
      accent: "#e0567f",
      image: ASSETS.minesCover,
      icon: <Grid3X3 size={22} />,
    },
    {
      id: "solitaire",
      title: "看山接龙",
      label: "已开放",
      accent: "#d85f2f",
      image: ASSETS.solitaireCover,
      icon: <Trophy size={22} />,
    },
    {
      id: "match",
      title: "花瓣消消乐",
      label: "已开放",
      accent: "#f5a623",
      image: ASSETS.matchCover,
      icon: <Sparkles size={22} />,
    },
    {
      id: "bubble",
      title: "泡泡灵感机",
      label: "已开放",
      accent: "#7c63d6",
      image: ASSETS.bubbleCover,
      icon: <Circle size={22} />,
    },
    {
      id: "link",
      title: "问答连连看",
      label: "已开放",
      accent: "#35a8e0",
      image: ASSETS.linkCover,
      icon: <Link2 size={22} />,
    },
    {
      id: "fishing",
      title: "看山钓鱼",
      label: "新开放",
      accent: "#2f9dd5",
      image: ASSETS.fishingCover,
      icon: <Fish size={22} />,
    },
  ] as const;

  return (
    <div className="hub">
      <section className="hero-stage" style={{ backgroundImage: `url(${ASSETS.arcadeHero})` }}>
        <div className="hero-copy">
          <p className="eyebrow">Zhihu Project Arcade</p>
          <h1>刘看山小游戏乐园</h1>
          <div className="hero-badges" aria-label="开放游戏">
            <span>贪吃蛇</span>
            <span>扫雷</span>
            <span>纸牌接龙</span>
            <span>消消乐</span>
            <span>泡泡龙</span>
            <span>连连看</span>
            <span>更多经典小游戏</span>
          </div>
        </div>
      </section>

      <section className="game-grid" aria-label="游戏列表">
        {games.map((game) => {
          const unlocked =
            game.id === "snake" ||
            game.id === "minesweeper" ||
            game.id === "solitaire" ||
            game.id === "match" ||
            game.id === "link" ||
            game.id === "bubble" ||
            game.id === "fishing";

          return (
            <button
              key={game.id}
              className={`game-card ${unlocked ? "" : "game-card--locked"}`}
              type="button"
              onClick={() => unlocked && onSelect(game.id)}
              disabled={!unlocked}
              style={{ "--game-accent": game.accent } as React.CSSProperties}
            >
              <img src={game.image} alt="" loading="lazy" />
              <span className="game-card-shade" />
              <span className="game-card-icon">{game.icon}</span>
              <span className="game-card-title">{game.title}</span>
              <span className="game-card-label">{game.label}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function suitIsRed(suit: CardSuit) {
  return suit === "hearts" || suit === "diamonds";
}

function cardPipLayout(rank: CardRank) {
  const count = Number.parseInt(rank, 10);

  if (!Number.isFinite(count)) {
    return [];
  }

  const top = 19;
  const upper = 31;
  const middle = 50;
  const lower = 69;
  const bottom = 81;
  const left = 31;
  const center = 50;
  const right = 69;

  const layouts: Record<number, Array<{ x: number; y: number; flip?: boolean }>> = {
    2: [
      { x: center, y: top },
      { x: center, y: bottom, flip: true },
    ],
    3: [
      { x: center, y: top },
      { x: center, y: middle },
      { x: center, y: bottom, flip: true },
    ],
    4: [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: bottom, flip: true },
      { x: right, y: bottom, flip: true },
    ],
    5: [
      { x: left, y: top },
      { x: right, y: top },
      { x: center, y: middle },
      { x: left, y: bottom, flip: true },
      { x: right, y: bottom, flip: true },
    ],
    6: [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: middle },
      { x: right, y: middle },
      { x: left, y: bottom, flip: true },
      { x: right, y: bottom, flip: true },
    ],
    7: [
      { x: left, y: top },
      { x: right, y: top },
      { x: center, y: upper },
      { x: left, y: middle },
      { x: right, y: middle },
      { x: left, y: bottom, flip: true },
      { x: right, y: bottom, flip: true },
    ],
    8: [
      { x: left, y: top },
      { x: right, y: top },
      { x: center, y: upper },
      { x: left, y: middle },
      { x: right, y: middle },
      { x: center, y: lower, flip: true },
      { x: left, y: bottom, flip: true },
      { x: right, y: bottom, flip: true },
    ],
    9: [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: upper },
      { x: right, y: upper },
      { x: center, y: middle },
      { x: left, y: lower, flip: true },
      { x: right, y: lower, flip: true },
      { x: left, y: bottom, flip: true },
      { x: right, y: bottom, flip: true },
    ],
    10: [
      { x: left, y: top },
      { x: right, y: top },
      { x: center, y: 25 },
      { x: left, y: upper },
      { x: right, y: upper },
      { x: left, y: lower, flip: true },
      { x: right, y: lower, flip: true },
      { x: center, y: 75, flip: true },
      { x: left, y: bottom, flip: true },
      { x: right, y: bottom, flip: true },
    ],
  };

  return layouts[count] ?? [];
}

function emptySolitaireFoundations(): Record<CardSuit, SolitaireCardModel[]> {
  return {
    spades: [],
    hearts: [],
    clubs: [],
    diamonds: [],
  };
}

function createSolvableSolitaireSequence(): SolitaireCardModel[] {
  const nextRankIndexes: Record<CardSuit, number> = {
    spades: 0,
    hearts: 0,
    clubs: 0,
    diamonds: 0,
  };
  const sequence: SolitaireCardModel[] = [];

  while (sequence.length < CARD_SUITS.length * CARD_RANKS.length) {
    const lowestNextRank = Math.min(...CARD_SUITS.map((suit) => nextRankIndexes[suit]));
    const availableSuits = CARD_SUITS.filter(
      (suit) => nextRankIndexes[suit] < CARD_RANKS.length && nextRankIndexes[suit] <= lowestNextRank + 2,
    );
    const suit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
    const rank = CARD_RANKS[nextRankIndexes[suit]];

    sequence.push({
      id: `${suit}-${rank}`,
      rank,
      suit,
      faceUp: false,
    });
    nextRankIndexes[suit] += 1;
  }

  return sequence;
}

function shuffledSolitaireItems<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function scoreSolitaireStockDrawOrder(cards: SolitaireCardModel[]): number {
  const firstDraws = cards.slice(0, 10);
  const rankValues = firstDraws.map((card) => cardRankValue(card.rank));
  const aces = firstDraws.filter((card) => card.rank === "A").length;
  const lowCards = rankValues.filter((value) => value <= 3).length;
  const highCards = rankValues.filter((value) => value >= 8).length;

  return new Set(rankValues).size + highCards * 2 - Math.max(0, aces - 1) * 18 - Math.max(0, lowCards - 4) * 6;
}

function varySolitaireStockDrawOrder(cards: SolitaireCardModel[]): SolitaireCardModel[] {
  let bestCards = cards;
  let bestScore = scoreSolitaireStockDrawOrder(cards);

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const candidate = shuffledSolitaireItems(cards);
    const score = scoreSolitaireStockDrawOrder(candidate);

    if (score > bestScore) {
      bestCards = candidate;
      bestScore = score;
    }
  }

  return bestCards;
}

function createSolvableSolitaireBoard(varyStock = true): SolitaireBoard {
  const sequence = createSolvableSolitaireSequence();
  const topToBottomColumns = Array.from({ length: SOLITAIRE_COLUMN_COUNT }, () => [] as SolitaireCardModel[]);
  const stockDrawOrder: SolitaireCardModel[] = [];
  const tableauSlots: Array<{ type: "tableau"; columnIndex: number }> = [];
  const stockSlots: Array<{ type: "stock" }> = Array.from({ length: 24 }, () => ({ type: "stock" }));

  for (let columnIndex = 0; columnIndex < SOLITAIRE_COLUMN_COUNT; columnIndex += 1) {
    for (let count = 0; count <= columnIndex; count += 1) {
      tableauSlots.push({ type: "tableau", columnIndex });
    }
  }

  const shuffledTableauSlots = shuffledSolitaireItems(tableauSlots);
  const earlyTableauCount = 3 + Math.floor(Math.random() * 4);
  const earlyStockCount = 19 + Math.floor(Math.random() * 5);
  const earlySlots = shuffledSolitaireItems([
    ...stockSlots.slice(0, earlyStockCount),
    ...shuffledTableauSlots.slice(0, earlyTableauCount),
  ]);
  const lateSlots = shuffledSolitaireItems([
    ...stockSlots.slice(earlyStockCount),
    ...shuffledTableauSlots.slice(earlyTableauCount),
  ]);
  const dealSlots: Array<{ type: "stock" } | { type: "tableau"; columnIndex: number }> = [...earlySlots, ...lateSlots];

  dealSlots.forEach((slot, index) => {
    const card = sequence[index];

    if (!card) {
      return;
    }

    if (slot.type === "stock") {
      stockDrawOrder.push(card);
      return;
    }

    topToBottomColumns[slot.columnIndex].push(card);
  });

  const tableau = topToBottomColumns.map((column) =>
    [...column]
      .reverse()
      .map((card, index, cards) => ({ ...card, faceUp: index === cards.length - 1 })),
  );
  const stock = (varyStock ? varySolitaireStockDrawOrder(stockDrawOrder) : stockDrawOrder)
    .reverse()
    .map((card) => ({ ...card, faceUp: false }));

  return {
    stock,
    waste: [],
    foundations: emptySolitaireFoundations(),
    tableau,
    moves: 0,
  };
}

function solitaireBoardHasFoundationOnlySolution(board: SolitaireBoard): boolean {
  const tableau = board.tableau.map((column) => column.map((card) => ({ ...card })));
  let stock = board.stock.map((card) => ({ ...card }));
  let waste = board.waste.map((card) => ({ ...card }));
  const foundationValues: Record<CardSuit, number> = {
    spades: 0,
    hearts: 0,
    clubs: 0,
    diamonds: 0,
  };
  let solvedCards = 0;

  CARD_SUITS.forEach((suit) => {
    const pile = board.foundations[suit];
    const topCard = pile[pile.length - 1];

    foundationValues[suit] = topCard ? cardRankValue(topCard.rank) : 0;
    solvedCards += pile.length;
  });
  let recyclesWithoutProgress = 0;

  const canMoveToFoundation = (card: SolitaireCardModel) => cardRankValue(card.rank) === foundationValues[card.suit] + 1;
  const moveToFoundation = (card: SolitaireCardModel) => {
    foundationValues[card.suit] = cardRankValue(card.rank);
    solvedCards += 1;
    recyclesWithoutProgress = 0;
  };

  for (let step = 0; step < 900 && solvedCards < CARD_SUITS.length * CARD_RANKS.length; step += 1) {
    let moved = false;

    do {
      moved = false;
      const wasteTop = waste[waste.length - 1];

      if (wasteTop && canMoveToFoundation(wasteTop)) {
        waste.pop();
        moveToFoundation(wasteTop);
        moved = true;
        continue;
      }

      for (const column of tableau) {
        const topCard = column[column.length - 1];

        if (!topCard?.faceUp || !canMoveToFoundation(topCard)) {
          continue;
        }

        column.pop();
        moveToFoundation(topCard);

        const nextTopCard = column[column.length - 1];

        if (nextTopCard && !nextTopCard.faceUp) {
          column[column.length - 1] = { ...nextTopCard, faceUp: true };
        }

        moved = true;
        break;
      }
    } while (moved);

    if (solvedCards === CARD_SUITS.length * CARD_RANKS.length) {
      return true;
    }

    if (stock.length) {
      const card = stock.pop();

      if (card) {
        waste.push({ ...card, faceUp: true });
      }

      continue;
    }

    if (waste.length) {
      recyclesWithoutProgress += 1;

      if (recyclesWithoutProgress > 1) {
        return false;
      }

      stock = waste.map((card) => ({ ...card, faceUp: false })).reverse();
      waste = [];
      continue;
    }

    return false;
  }

  return solvedCards === CARD_SUITS.length * CARD_RANKS.length;
}

function scoreSolitaireOpeningVariety(board: SolitaireBoard): number {
  const topCards = board.tableau.flatMap((column) => {
    const topCard = column[column.length - 1];
    return topCard?.faceUp ? [topCard] : [];
  });
  const firstDraws = board.stock.slice(-10).reverse();
  const rankValues = topCards.map((card) => cardRankValue(card.rank));
  const minRank = Math.min(...rankValues);
  const maxRank = Math.max(...rankValues);
  const aces = topCards.filter((card) => card.rank === "A").length;
  const twos = topCards.filter((card) => card.rank === "2").length;
  const earlyDrawAces = firstDraws.filter((card) => card.rank === "A").length;
  const earlyDrawLowCards = firstDraws.filter((card) => cardRankValue(card.rank) <= 3).length;
  const lowCards = rankValues.filter((value) => value <= 4).length;
  const highCards = rankValues.filter((value) => value >= 8).length;
  const uniqueRanks = new Set(rankValues).size;
  let tableauMoves = 0;

  topCards.forEach((card, sourceIndex) => {
    board.tableau.forEach((column, targetIndex) => {
      if (sourceIndex !== targetIndex && canPlaceOnSolitaireTableau(card, column)) {
        tableauMoves += 1;
      }
    });
  });

  return (
    Math.min(maxRank - minRank, 10) * 2 +
    uniqueRanks * 2 +
    highCards * 3 +
    Math.min(tableauMoves, 5) * 3 -
    Math.max(0, lowCards - 3) * 5 -
    Math.max(0, aces - 1) * 14 -
    Math.max(0, aces + twos - 3) * 7 -
    Math.max(0, earlyDrawAces - 1) * 14 -
    Math.max(0, earlyDrawLowCards - 4) * 5
  );
}

function advanceSolitaireSafeStep(board: SolitaireBoard): SolitaireMoveResult {
  const wasteTop = board.waste[board.waste.length - 1];

  if (wasteTop && canPlaceOnSolitaireFoundation(wasteTop, board.foundations[wasteTop.suit], wasteTop.suit)) {
    return moveSolitaireCards(board, { type: "waste" }, { type: "foundation", suit: wasteTop.suit });
  }

  for (let columnIndex = 0; columnIndex < board.tableau.length; columnIndex += 1) {
    const column = board.tableau[columnIndex];
    const cardIndex = column.length - 1;
    const topCard = column[cardIndex];

    if (!topCard?.faceUp || !canPlaceOnSolitaireFoundation(topCard, board.foundations[topCard.suit], topCard.suit)) {
      continue;
    }

    return moveSolitaireCards(
      board,
      { type: "tableau", columnIndex, cardIndex },
      { type: "foundation", suit: topCard.suit },
    );
  }

  if (board.stock.length) {
    const nextBoard = cloneSolitaireBoard(board);
    const card = nextBoard.stock.pop();

    if (card) {
      nextBoard.waste.push({ ...card, faceUp: true });
      nextBoard.moves += 1;
      return { board: nextBoard, moved: true };
    }
  }

  if (board.waste.length) {
    const nextBoard = cloneSolitaireBoard(board);
    nextBoard.stock = nextBoard.waste.map((card) => ({ ...card, faceUp: false })).reverse();
    nextBoard.waste = [];
    nextBoard.moves += 1;
    return { board: nextBoard, moved: true };
  }

  return { board, moved: false };
}

function dealSolitaireBoard(): SolitaireBoard {
  let fallbackBoard = createSolvableSolitaireBoard(false);
  let bestBoard = fallbackBoard;
  let bestScore = solitaireBoardHasFoundationOnlySolution(bestBoard) ? scoreSolitaireOpeningVariety(bestBoard) : -Infinity;

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const board = createSolvableSolitaireBoard();

    if (!solitaireBoardHasFoundationOnlySolution(board)) {
      continue;
    }

    fallbackBoard = board;

    const score = scoreSolitaireOpeningVariety(board);

    if (score > bestScore) {
      bestBoard = board;
      bestScore = score;
    }

    if (score >= 36) {
      return board;
    }
  }

  return bestScore > -Infinity ? bestBoard : fallbackBoard;
}

function cardRankValue(rank: CardRank): number {
  return CARD_RANKS.indexOf(rank) + 1;
}

function cardIsRed(card: Pick<SolitaireCardModel, "suit">): boolean {
  return suitIsRed(card.suit);
}

function cardsAreOppositeColors(card: SolitaireCardModel, target: SolitaireCardModel): boolean {
  return cardIsRed(card) !== cardIsRed(target);
}

function canPlaceOnSolitaireFoundation(
  card: SolitaireCardModel,
  foundation: SolitaireCardModel[],
  suit: CardSuit,
): boolean {
  if (card.suit !== suit) {
    return false;
  }

  const topCard = foundation[foundation.length - 1];

  if (!topCard) {
    return card.rank === "A";
  }

  return topCard.suit === card.suit && cardRankValue(card.rank) === cardRankValue(topCard.rank) + 1;
}

function canPlaceOnSolitaireTableau(card: SolitaireCardModel, column: SolitaireCardModel[]): boolean {
  const topCard = column[column.length - 1];

  if (!topCard) {
    return card.rank === "K";
  }

  return topCard.faceUp && cardsAreOppositeColors(card, topCard) && cardRankValue(card.rank) + 1 === cardRankValue(topCard.rank);
}

function isValidSolitaireSequence(cards: SolitaireCardModel[]): boolean {
  if (!cards.length || cards.some((card) => !card.faceUp)) {
    return false;
  }

  return cards.every((card, index) => {
    const nextCard = cards[index + 1];

    if (!nextCard) {
      return true;
    }

    return cardsAreOppositeColors(card, nextCard) && cardRankValue(card.rank) === cardRankValue(nextCard.rank) + 1;
  });
}

function getSolitaireMovableCards(board: SolitaireBoard, source: SolitaireMoveSource): SolitaireCardModel[] {
  if (source.type === "waste") {
    const topCard = board.waste[board.waste.length - 1];
    return topCard ? [topCard] : [];
  }

  if (source.type === "foundation") {
    const topCard = board.foundations[source.suit][board.foundations[source.suit].length - 1];
    return topCard ? [topCard] : [];
  }

  const column = board.tableau[source.columnIndex] ?? [];
  const cards = column.slice(source.cardIndex);

  return isValidSolitaireSequence(cards) ? cards : [];
}

function cloneSolitaireBoard(board: SolitaireBoard): SolitaireBoard {
  return {
    stock: [...board.stock],
    waste: [...board.waste],
    foundations: {
      spades: [...board.foundations.spades],
      hearts: [...board.foundations.hearts],
      clubs: [...board.foundations.clubs],
      diamonds: [...board.foundations.diamonds],
    },
    tableau: board.tableau.map((column) => [...column]),
    moves: board.moves,
  };
}

function revealSolitaireColumnTop(tableau: SolitaireCardModel[][], columnIndex: number): void {
  const column = tableau[columnIndex];
  const topCard = column?.[column.length - 1];

  if (topCard && !topCard.faceUp) {
    column[column.length - 1] = { ...topCard, faceUp: true };
  }
}

function removeSolitaireCards(board: SolitaireBoard, source: SolitaireMoveSource): void {
  if (source.type === "waste") {
    board.waste.pop();
    return;
  }

  if (source.type === "foundation") {
    board.foundations[source.suit].pop();
    return;
  }

  board.tableau[source.columnIndex].splice(source.cardIndex);
  revealSolitaireColumnTop(board.tableau, source.columnIndex);
}

function moveSolitaireCards(
  board: SolitaireBoard,
  source: SolitaireMoveSource,
  target: SolitaireMoveTarget,
): SolitaireMoveResult {
  const movingCards = getSolitaireMovableCards(board, source);

  if (!movingCards.length) {
    return { board, moved: false };
  }

  if (target.type === "tableau" && source.type === "tableau" && source.columnIndex === target.columnIndex) {
    return { board, moved: false };
  }

  if (target.type === "foundation") {
    const [card] = movingCards;

    if (movingCards.length !== 1 || !canPlaceOnSolitaireFoundation(card, board.foundations[target.suit], target.suit)) {
      return { board, moved: false };
    }

    const nextBoard = cloneSolitaireBoard(board);
    removeSolitaireCards(nextBoard, source);
    nextBoard.foundations[target.suit].push({ ...card, faceUp: true });
    nextBoard.moves += 1;
    return { board: nextBoard, moved: true };
  }

  const [firstCard] = movingCards;

  if (!canPlaceOnSolitaireTableau(firstCard, board.tableau[target.columnIndex])) {
    return { board, moved: false };
  }

  const nextBoard = cloneSolitaireBoard(board);
  removeSolitaireCards(nextBoard, source);
  nextBoard.tableau[target.columnIndex].push(...movingCards.map((card) => ({ ...card, faceUp: true })));
  nextBoard.moves += 1;
  return { board: nextBoard, moved: true };
}

function solitaireSourcesMatch(first: SolitaireMoveSource | null, second: SolitaireMoveSource | null): boolean {
  if (!first || !second || first.type !== second.type) {
    return false;
  }

  if (first.type === "waste" && second.type === "waste") {
    return true;
  }

  if (first.type === "foundation" && second.type === "foundation") {
    return first.suit === second.suit;
  }

  if (first.type === "tableau" && second.type === "tableau") {
    return first.columnIndex === second.columnIndex && first.cardIndex === second.cardIndex;
  }

  return false;
}

function KanshanCardMascot({ variant = "idle" }: { variant?: SolitaireKanshanVariant }) {
  return (
    <img
      className={`card-kanshan card-kanshan--${variant}`}
      src={SOLITAIRE_KANSHAN[variant]}
      alt=""
      draggable={false}
      aria-hidden="true"
    />
  );
}

function SolitaireCard({
  rank,
  suit,
  faceDown = false,
  compact = false,
  selected = false,
  className = "",
  onClick,
  onDoubleClick,
  draggable = false,
  onDragStart,
  onDragEnd,
}: {
  rank: CardRank;
  suit: CardSuit;
  faceDown?: boolean;
  compact?: boolean;
  selected?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  const red = suitIsRed(suit);
  const suitMark = CARD_SUIT_MARKS[suit];
  const pips = cardPipLayout(rank);
  const isCourt = rank === "J" || rank === "Q" || rank === "K";
  const isAce = rank === "A";
  const mascotVariant = CARD_SUIT_KANSHAN[suit];
  const interactive = Boolean(onClick || onDoubleClick || draggable);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
  };
  const baseClassName = [
    "sol-card",
    compact ? "sol-card--compact" : "",
    selected ? "sol-card--selected" : "",
    draggable ? "sol-card--draggable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (faceDown) {
    return (
      <div
        className={`${baseClassName} sol-card--back`}
        aria-label="牌背"
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onKeyDown={interactive ? handleKeyDown : undefined}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <span className="sol-card-back-pattern" />
        <KanshanCardMascot variant="back" />
      </div>
    );
  }

  return (
    <div
      className={[
        baseClassName,
        red ? "sol-card--red" : "sol-card--black",
        isCourt ? "sol-card--court" : "",
        isAce ? "sol-card--ace" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${CARD_SUIT_LABELS[suit]} ${rank}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ "--card-color": CARD_SUIT_COLORS[suit] } as React.CSSProperties}
    >
      <span className="sol-card-corner sol-card-corner--top">
        <strong>{rank}</strong>
        <span>{suitMark}</span>
      </span>
      <span className="sol-card-corner sol-card-corner--bottom">
        <strong>{rank}</strong>
        <span>{suitMark}</span>
      </span>
      <span className="sol-card-watermark">
        <KanshanCardMascot variant={mascotVariant} />
      </span>

      {isAce && (
        <span className="sol-card-ace-mark">
          <span>{suitMark}</span>
          <KanshanCardMascot variant={mascotVariant} />
        </span>
      )}

      {isCourt && (
        <span className="sol-card-court-art">
          <KanshanCardMascot variant={mascotVariant} />
        </span>
      )}

      {!isAce && !isCourt && (
        <span className="sol-card-pips">
          {pips.map((pip, index) => (
            <span
              key={`${pip.x}-${pip.y}-${index}`}
              className={`sol-card-pip ${pip.flip ? "sol-card-pip--flip" : ""}`}
              style={
                {
                  "--pip-x": `${pip.x}%`,
                  "--pip-y": `${pip.y}%`,
                } as React.CSSProperties
              }
            >
              {suitMark}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function SolitaireGame({ onBack, playTone }: { onBack: () => void; playTone: GameTone }) {
  const [board, setBoard] = useState<SolitaireBoard>(() => dealSolitaireBoard());
  const [selected, setSelected] = useState<SolitaireMoveSource | null>(null);
  const [dragging, setDragging] = useState<SolitaireMoveSource | null>(null);
  const [history, setHistory] = useState<SolitaireBoard[]>([]);
  const dragSource = useRef<SolitaireMoveSource | null>(null);
  const winSoundPlayed = useRef(false);
  const wasteSource: SolitaireMoveSource = { type: "waste" };
  const foundationCount = useMemo(
    () => CARD_SUITS.reduce((total, suit) => total + board.foundations[suit].length, 0),
    [board.foundations],
  );
  const isComplete = foundationCount === CARD_SUITS.length * CARD_RANKS.length;
  const visibleWaste = board.waste.slice(-3);

  const resetGame = useCallback(() => {
    setBoard(dealSolitaireBoard());
    setHistory([]);
    setSelected(null);
    setDragging(null);
    dragSource.current = null;
    winSoundPlayed.current = false;
    playTone(560, 0.08, "triangle");
  }, [playTone]);

  useEffect(() => {
    if (!isComplete) {
      winSoundPlayed.current = false;
      return;
    }

    if (winSoundPlayed.current) {
      return;
    }

    winSoundPlayed.current = true;
    playTone(760, 0.08, "triangle");
    const secondTone = window.setTimeout(() => playTone(960, 0.1, "triangle"), 120);
    const thirdTone = window.setTimeout(() => playTone(1180, 0.14, "sine"), 260);

    return () => {
      window.clearTimeout(secondTone);
      window.clearTimeout(thirdTone);
    };
  }, [isComplete, playTone]);

  const commitBoard = useCallback(
    (nextBoard: SolitaireBoard) => {
      setHistory((items) => [...items.slice(-79), cloneSolitaireBoard(board)]);
      setBoard(nextBoard);
      setSelected(null);
      setDragging(null);
      dragSource.current = null;
    },
    [board],
  );

  const undoMove = useCallback(() => {
    const previousBoard = history[history.length - 1];

    if (!previousBoard) {
      playTone(180, 0.05, "sawtooth");
      return;
    }

    setBoard(previousBoard);
    setHistory((items) => items.slice(0, -1));
    setSelected(null);
    setDragging(null);
    dragSource.current = null;
    playTone(360, 0.06, "triangle");
  }, [history, playTone]);

  const rescueMove = useCallback(() => {
    if (solitaireBoardHasFoundationOnlySolution(board)) {
      const result = advanceSolitaireSafeStep(board);

      if (result.moved) {
        commitBoard(result.board);
        playTone(700, 0.07, "triangle");
        return;
      }
    }

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const previousBoard = history[index];

      if (!solitaireBoardHasFoundationOnlySolution(previousBoard)) {
        continue;
      }

      setBoard(cloneSolitaireBoard(previousBoard));
      setHistory((items) => items.slice(0, index));
      setSelected(null);
      setDragging(null);
      dragSource.current = null;
      playTone(520, 0.1, "triangle");
      return;
    }

    playTone(180, 0.08, "sawtooth");
  }, [board, commitBoard, history, playTone]);

  const applyMove = useCallback(
    (source: SolitaireMoveSource, target: SolitaireMoveTarget, invalidTone = true) => {
      const result = moveSolitaireCards(board, source, target);

      if (!result.moved) {
        if (invalidTone) {
          playTone(180, 0.06, "sawtooth");
        }

        return false;
      }

      commitBoard(result.board);
      playTone(620, 0.07, "triangle");
      return true;
    },
    [board, commitBoard, playTone],
  );

  const selectSource = useCallback(
    (source: SolitaireMoveSource) => {
      if (!getSolitaireMovableCards(board, source).length) {
        setSelected(null);
        return;
      }

      setSelected((current) => (solitaireSourcesMatch(current, source) ? null : source));
      playTone(430, 0.04, "triangle");
    },
    [board, playTone],
  );

  const flipTableauTop = useCallback(
    (columnIndex: number) => {
      const column = board.tableau[columnIndex];
      const topIndex = column.length - 1;
      const topCard = column[topIndex];

      if (!topCard || topCard.faceUp) {
        return;
      }

      const nextBoard = cloneSolitaireBoard(board);
      nextBoard.tableau[columnIndex][topIndex] = { ...topCard, faceUp: true };
      nextBoard.moves += 1;
      commitBoard(nextBoard);
      playTone(520, 0.06, "triangle");
    },
    [board, commitBoard, playTone],
  );

  const drawFromStock = useCallback(() => {
    if (!board.stock.length && !board.waste.length) {
      playTone(180, 0.05, "sawtooth");
      return;
    }

    const nextBoard = cloneSolitaireBoard(board);

    if (nextBoard.stock.length) {
      const card = nextBoard.stock.pop();

      if (card) {
        nextBoard.waste.push({ ...card, faceUp: true });
      }
    } else {
      nextBoard.stock = nextBoard.waste.map((card) => ({ ...card, faceUp: false })).reverse();
      nextBoard.waste = [];
    }

    nextBoard.moves += 1;
    commitBoard(nextBoard);
    playTone(500, 0.05, "triangle");
  }, [board, commitBoard, playTone]);

  const autoMoveToFoundation = useCallback(
    (source: SolitaireMoveSource) => {
      const [card] = getSolitaireMovableCards(board, source);

      if (!card) {
        return;
      }

      applyMove(source, { type: "foundation", suit: card.suit });
    },
    [applyMove, board],
  );

  const handleTableauCardClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, columnIndex: number, cardIndex: number) => {
      event.stopPropagation();

      const card = board.tableau[columnIndex][cardIndex];

      if (!card) {
        return;
      }

      if (!card.faceUp) {
        if (cardIndex === board.tableau[columnIndex].length - 1) {
          flipTableauTop(columnIndex);
        }

        return;
      }

      const source: SolitaireMoveSource = { type: "tableau", columnIndex, cardIndex };

      if (selected && !solitaireSourcesMatch(selected, source)) {
        const moved = applyMove(selected, { type: "tableau", columnIndex }, false);

        if (moved) {
          return;
        }
      }

      selectSource(source);
    },
    [applyMove, board.tableau, flipTableauTop, selectSource, selected],
  );

  const handleFoundationClick = useCallback(
    (suit: CardSuit) => {
      const source: SolitaireMoveSource = { type: "foundation", suit };

      if (selected && !solitaireSourcesMatch(selected, source)) {
        applyMove(selected, { type: "foundation", suit });
        return;
      }

      selectSource(source);
    },
    [applyMove, selectSource, selected],
  );

  const beginDrag = useCallback(
    (event: React.DragEvent<HTMLDivElement>, source: SolitaireMoveSource) => {
      if (!getSolitaireMovableCards(board, source).length) {
        event.preventDefault();
        return;
      }

      dragSource.current = source;
      setDragging(source);
      setSelected(source);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-liukanshan-solitaire", JSON.stringify(source));
    },
    [board],
  );

  const endDrag = useCallback(() => {
    dragSource.current = null;
    setDragging(null);
  }, []);

  const handleDragOverTarget = useCallback(
    (event: React.DragEvent<HTMLDivElement>, target: SolitaireMoveTarget) => {
      const source = dragSource.current ?? selected;

      if (source && moveSolitaireCards(board, source, target).moved) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }
    },
    [board, selected],
  );

  const handleDropTarget = useCallback(
    (event: React.DragEvent<HTMLDivElement>, target: SolitaireMoveTarget) => {
      event.preventDefault();

      const source = dragSource.current;

      if (source) {
        applyMove(source, target);
      }

      endDrag();
    },
    [applyMove, endDrag],
  );

  const sourceIsActive = useCallback(
    (source: SolitaireMoveSource) => solitaireSourcesMatch(selected, source) || solitaireSourcesMatch(dragging, source),
    [dragging, selected],
  );

  const tableauCardIsActive = useCallback(
    (columnIndex: number, cardIndex: number) => {
      const activeSource = dragging ?? selected;

      return activeSource?.type === "tableau" && activeSource.columnIndex === columnIndex && cardIndex >= activeSource.cardIndex;
    },
    [dragging, selected],
  );

  return (
    <section className="game-view solitaire-view">
      <GameHeader
        title="看山接龙"
        onBack={onBack}
        controls={
          <>
            <button
              className="icon-button"
              type="button"
              onClick={undoMove}
              disabled={!history.length}
              aria-label="撤销一步"
              title="撤销一步"
            >
              <Undo2 size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={rescueMove}
              aria-label="救援一步"
              title="救援一步"
            >
              <Lightbulb size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={resetGame}
              aria-label="重新发牌"
              title="重新发牌"
            >
              <Shuffle size={20} />
            </button>
          </>
        }
      />

      <div className="solitaire-showcase">
        <div className="solitaire-table">
          <div className="solitaire-top-row">
            <div className="solitaire-stock" aria-label="抽牌区">
              <div
                className={`solitaire-pile solitaire-stock-pile ${board.stock.length ? "" : "solitaire-pile--empty"}`}
                role="button"
                tabIndex={0}
                onClick={drawFromStock}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    drawFromStock();
                  }
                }}
                aria-label={board.stock.length ? "抽牌" : "回收废牌"}
              >
                {board.stock.length ? (
                  <SolitaireCard rank="A" suit="spades" faceDown />
                ) : (
                  <span className="solitaire-empty-slot solitaire-empty-slot--stock">
                    <RotateCcw size={22} />
                  </span>
                )}
              </div>
              <div className="solitaire-waste-stack" aria-label="废牌">
                {visibleWaste.length ? (
                  visibleWaste.map((card, index) => {
                    const isTop = index === visibleWaste.length - 1;

                    return (
                      <div
                        key={card.id}
                        className={`solitaire-waste-card ${isTop ? "" : "solitaire-waste-card--peek"}`}
                        style={{ "--waste-index": index } as React.CSSProperties}
                      >
                        <SolitaireCard
                          rank={card.rank}
                          suit={card.suit}
                          compact={!isTop}
                          selected={isTop && sourceIsActive(wasteSource)}
                          onClick={
                            isTop
                              ? (event) => {
                                  event.stopPropagation();
                                  selectSource(wasteSource);
                                }
                              : undefined
                          }
                          onDoubleClick={
                            isTop
                              ? (event) => {
                                  event.stopPropagation();
                                  autoMoveToFoundation(wasteSource);
                                }
                              : undefined
                          }
                          draggable={isTop}
                          onDragStart={isTop ? (event) => beginDrag(event, wasteSource) : undefined}
                          onDragEnd={endDrag}
                        />
                      </div>
                    );
                  })
                ) : (
                  <span className="solitaire-empty-slot solitaire-empty-slot--waste">
                    <KanshanCardMascot variant="peek" />
                  </span>
                )}
              </div>
            </div>
            <div className="solitaire-foundations">
              {CARD_SUITS.map((suit) => {
                const pile = board.foundations[suit];
                const topCard = pile[pile.length - 1];
                const source: SolitaireMoveSource = { type: "foundation", suit };
                const target: SolitaireMoveTarget = { type: "foundation", suit };

                return (
                  <div
                    key={suit}
                    className="solitaire-foundation-slot"
                    onClick={() => handleFoundationClick(suit)}
                    onDragOver={(event) => handleDragOverTarget(event, target)}
                    onDrop={(event) => handleDropTarget(event, target)}
                  >
                    {topCard ? (
                      <SolitaireCard
                        rank={topCard.rank}
                        suit={topCard.suit}
                        compact
                        selected={sourceIsActive(source)}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleFoundationClick(suit);
                        }}
                        draggable
                        onDragStart={(event) => beginDrag(event, source)}
                        onDragEnd={endDrag}
                      />
                    ) : (
                      <span className="solitaire-empty-slot solitaire-empty-slot--foundation">
                        <span>{CARD_SUIT_MARKS[suit]}</span>
                        <KanshanCardMascot variant={suit} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="solitaire-tableau" aria-label="接龙牌列">
            {board.tableau.map((column, columnIndex) => {
              const target: SolitaireMoveTarget = { type: "tableau", columnIndex };

              return (
              <div
                key={`column-${columnIndex}`}
                className="solitaire-tableau-column"
                style={
                  {
                    "--column-height": `${Math.max(
                      430,
                      SOLITAIRE_TABLEAU_CARD_HEIGHT + Math.max(column.length - 1, 0) * SOLITAIRE_TABLEAU_CARD_GAP + 18,
                    )}px`,
                  } as React.CSSProperties
                }
                onClick={() => {
                  if (selected) {
                    applyMove(selected, target);
                  }
                }}
                onDragOver={(event) => handleDragOverTarget(event, target)}
                onDrop={(event) => handleDropTarget(event, target)}
              >
                {!column.length && (
                  <span className="solitaire-empty-slot solitaire-empty-slot--column">
                    <span>K</span>
                  </span>
                )}
                {column.map((card, cardIndex) => {
                  const source: SolitaireMoveSource = { type: "tableau", columnIndex, cardIndex };
                  const movable = card.faceUp && getSolitaireMovableCards(board, source).length > 0;

                  return (
                    <div
                      key={card.id}
                      className="solitaire-tableau-card"
                      style={{ "--card-top": `${cardIndex * SOLITAIRE_TABLEAU_CARD_GAP}px` } as React.CSSProperties}
                    >
                      <SolitaireCard
                        rank={card.rank}
                        suit={card.suit}
                        faceDown={!card.faceUp}
                        selected={tableauCardIsActive(columnIndex, cardIndex)}
                        draggable={movable}
                        onClick={(event) => handleTableauCardClick(event, columnIndex, cardIndex)}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          if (card.faceUp) {
                            autoMoveToFoundation(source);
                          }
                        }}
                        onDragStart={movable ? (event) => beginDrag(event, source) : undefined}
                        onDragEnd={endDrag}
                      />
                    </div>
                  );
                })}
              </div>
              );
            })}
          </div>

          {isComplete && (
            <div className="solitaire-victory-overlay" role="dialog" aria-modal="true" aria-label="纸牌接龙胜利结算">
              <div className="solitaire-victory-glow" aria-hidden="true" />
              <section className="solitaire-victory-card">
                <img
                  className="solitaire-victory-kanshan"
                  src={SOLITAIRE_VICTORY_ART}
                  alt=""
                  draggable={false}
                  aria-hidden="true"
                />
                <div className="solitaire-victory-copy">
                  <span>目标达成</span>
                  <h3>胜利！</h3>
                  <p>52 张牌全部收齐，刘看山已经把奖杯抱稳了。</p>
                </div>
                <div className="solitaire-victory-stats">
                  <Stat icon={<Trophy size={18} />} label="步数" value={board.moves} />
                  <Stat icon={<Sparkles size={18} />} label="收牌" value="52/52" />
                </div>
                <div className="solitaire-victory-actions">
                  <button type="button" className="solitaire-victory-primary" onClick={resetGame}>
                    <Shuffle size={18} />
                    <span>再来一局</span>
                  </button>
                  <button type="button" className="solitaire-victory-secondary" onClick={onBack}>
                    <Home size={18} />
                    <span>回到大厅</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>

        <aside className="solitaire-deck-panel">
          <div className="solitaire-card-back-sample">
            <SolitaireCard rank="A" suit="spades" faceDown />
          </div>
          <div className="solitaire-progress-card">
            <KanshanCardMascot variant={isComplete ? "seal" : "idle"} />
            <strong>{foundationCount}/52</strong>
          </div>
          <div className="stat-strip solitaire-stats">
            <Stat icon={<Trophy size={18} />} label="步数" value={board.moves} />
            <Stat icon={<Circle size={18} />} label="牌库" value={board.stock.length + board.waste.length} />
            <Stat icon={<Sparkles size={18} />} label="收牌" value={foundationCount} />
          </div>
          <section className="solitaire-rules-panel" aria-label="纸牌接龙规则">
            <h3>规则</h3>
            <ul>
              <li>目标：把 52 张牌全部移到右上角收牌区。</li>
              <li>收牌区：每个花色单独一叠，只能从 A 按同花色升到 K。</li>
              <li>牌列：只能按点数递减、红黑交替接牌。</li>
              <li>例如：红心 7 可以放到黑桃 8 或梅花 8 下，不能放到红心 8 或方片 8 下。</li>
              <li>空牌列：只能放 K，或以 K 开头的一串明牌。</li>
              <li>暗牌：一列最下面的暗牌露出后，可以翻开。</li>
              <li>牌库：每次翻 1 张到废牌区；牌库空时可回收废牌重新翻。</li>
              <li>移动：可拖动，也可先点选牌再点目标；双击会尝试送入收牌区。</li>
              <li>可解：每局会随机生成候选牌面，并通过内置验证保证存在完整解法。</li>
              <li>撤销：走错时可撤销一步。</li>
              <li>救援：灯泡会沿可解路线推进一步；若已走偏，会回到最近可保证可解的历史局面。</li>
              <li>本模式不设暂存区，暂存区属于空当接龙类玩法。</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SnakeGame({ onBack, playTone }: { onBack: () => void; playTone: GameTone }) {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState(() => randomFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => readNumber("lks.snake.best"));
  const [status, setStatus] = useState<SnakeStatus>("ready");
  const direction = useRef<DirectionName>("right");
  const nextDirection = useRef<DirectionName>("right");
  const swipeStart = useRef<Point | null>(null);

  const resetGame = useCallback(() => {
    direction.current = "right";
    nextDirection.current = "right";
    setSnake(INITIAL_SNAKE);
    setFood(randomFood(INITIAL_SNAKE));
    setScore(0);
    setStatus("ready");
  }, []);

  const changeDirection = useCallback(
    (next: DirectionName) => {
      if (OPPOSITE[direction.current] === next) {
        return;
      }

      nextDirection.current = next;

      if (status === "ready" || status === "paused") {
        setStatus("running");
      }
    },
    [status],
  );

  const toggleRun = useCallback(() => {
    if (status === "ended") {
      resetGame();
      return;
    }

    setStatus((current) => {
      if (current === "running") {
        return "paused";
      }
      return "running";
    });
  }, [resetGame, status]);

  const handleSnakePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    swipeStart.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleSnakePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = swipeStart.current;

      if (!start) {
        return;
      }

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;

      if (Math.hypot(deltaX, deltaY) < 18) {
        return;
      }

      event.preventDefault();
      changeDirection(
        Math.abs(deltaX) > Math.abs(deltaY)
          ? deltaX > 0
            ? "right"
            : "left"
          : deltaY > 0
            ? "down"
            : "up",
      );
      swipeStart.current = { x: event.clientX, y: event.clientY };
    },
    [changeDirection],
  );

  const handleSnakePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    swipeStart.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keyMap: Partial<Record<string, DirectionName>> = {
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
      };

      const mapped = keyMap[event.key];

      if (mapped) {
        event.preventDefault();
        changeDirection(mapped);
      }

      if (event.key === " ") {
        event.preventDefault();
        toggleRun();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection, toggleRun]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const speed = Math.max(82, 148 - Math.floor(score / 50) * 9);
    const timer = window.setInterval(() => {
      setSnake((current) => {
        const move = DIRECTIONS[nextDirection.current];
        direction.current = nextDirection.current;
        const head = current[0];
        const nextHead = { x: head.x + move.x, y: head.y + move.y };
        const ate = samePoint(nextHead, food);
        const collisionBody = ate ? current : current.slice(0, -1);
        const hitWall =
          nextHead.x < 0 ||
          nextHead.x >= SNAKE_SIZE ||
          nextHead.y < 0 ||
          nextHead.y >= SNAKE_SIZE;
        const hitBody = collisionBody.some((part) => samePoint(part, nextHead));

        if (hitWall || hitBody) {
          setStatus("ended");
          playTone(150, 0.18, "sawtooth");
          return current;
        }

        const nextSnake = [nextHead, ...current];

        if (ate) {
          setFood(randomFood(nextSnake));
          setScore((value) => value + 10);
          playTone(760, 0.05, "triangle");
          return nextSnake;
        }

        nextSnake.pop();
        return nextSnake;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [food, playTone, score, status]);

  useEffect(() => {
    if (status === "ended" && score > best) {
      setBest(score);
      writeNumber("lks.snake.best", score);
    }
  }, [best, score, status]);

  const statusLabel = {
    ready: "待出发",
    running: "采集中",
    paused: "休息中",
    ended: "撞到了",
  }[status];

  return (
    <section className="game-view snake-view">
      <GameHeader
        title="贪吃刘看山"
        onBack={onBack}
        controls={
          <>
            <button
              className="icon-button"
              type="button"
              onClick={toggleRun}
              aria-label="开始或暂停"
              title="开始或暂停"
            >
              {status === "running" ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={resetGame}
              aria-label="重新开始"
              title="重新开始"
            >
              <RotateCcw size={20} />
            </button>
          </>
        }
      />

      <div className="play-layout">
        <aside className="game-panel snake-panel">
          <KanshanSnakePreview />
          <div className="stat-strip">
            <Stat icon={<Sparkles size={18} />} label="灵感" value={score} />
            <Stat icon={<Trophy size={18} />} label="最高" value={best} />
            <Stat icon={<Leaf size={18} />} label="状态" value={statusLabel} />
          </div>
          <button className="primary-action" type="button" onClick={toggleRun}>
            {status === "running" ? "暂停" : status === "ended" ? "再来一局" : "开始"}
          </button>
        </aside>

        <div className="board-shell snake-shell">
          <div
            className="snake-board"
            role="grid"
            aria-label="贪吃刘看山棋盘"
            onPointerDown={handleSnakePointerDown}
            onPointerMove={handleSnakePointerMove}
            onPointerUp={handleSnakePointerEnd}
            onPointerCancel={handleSnakePointerEnd}
            onPointerLeave={handleSnakePointerEnd}
          >
            {Array.from({ length: SNAKE_SIZE * SNAKE_SIZE }, (_, index) => {
              const point = { x: index % SNAKE_SIZE, y: Math.floor(index / SNAKE_SIZE) };
              const snakeIndex = snake.findIndex((part) => samePoint(part, point));
              const isHead = snakeIndex === 0;
              const isSnake = snakeIndex >= 0;
              const isTail = isSnake && snakeIndex === snake.length - 1;
              const isFood = samePoint(food, point);
              const connections = snakeConnections(point, snake, snakeIndex);
              const tailDirection = isTail ? connections[0] : undefined;

              return (
                <span
                  key={`${point.x}-${point.y}`}
                  className={[
                    "snake-cell",
                    isSnake ? "snake-cell--body" : "",
                    isTail && !isHead ? "snake-cell--tail" : "",
                    isHead ? `snake-cell--head snake-cell--head-${direction.current}` : "",
                    isFood ? "snake-cell--food" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {isSnake &&
                    connections.map((connection) => (
                      <span
                        key={connection}
                        className={`body-bridge body-bridge--${connection}`}
                      />
                    ))}
                  {isHead && (
                    <img
                      className="snake-head-sprite"
                      src={ASSETS.kanshanHead}
                      alt=""
                      draggable={false}
                    />
                  )}
                  {isTail && !isHead && (
                    <span
                      className={`tail-puff ${tailDirection ? `tail-puff--from-${tailDirection}` : ""}`}
                    />
                  )}
                  {isFood && <span className="food-spark" />}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function MinesweeperGame({ onBack, playTone }: { onBack: () => void; playTone: GameTone }) {
  const [board, setBoard] = useState<MineCell[]>(() => createEmptyMineBoard());
  const [status, setStatus] = useState<MineStatus>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState(() => readNumber("lks.mines.best"));
  const [flagMode, setFlagMode] = useState(false);
  const mineLongPressTimer = useRef<number | null>(null);
  const suppressMineClick = useRef(false);

  const flagsUsed = useMemo(() => board.filter((cell) => cell.flagged).length, [board]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyMineBoard());
    setStatus("ready");
    setElapsed(0);
    setFlagMode(false);
  }, []);

  const finishWin = useCallback(() => {
    const finalTime = Math.max(1, elapsed);
    setStatus("won");
    playTone(820, 0.11, "triangle");

    if (best === 0 || finalTime < best) {
      setBest(finalTime);
      writeNumber("lks.mines.best", finalTime);
    }
  }, [best, elapsed, playTone]);

  const toggleFlag = useCallback(
    (index: number) => {
      if (status === "won" || status === "lost") {
        return;
      }

      setBoard((current) =>
        current.map((cell, cellIndex) => {
          if (cellIndex !== index || cell.revealed) {
            return cell;
          }

          return { ...cell, flagged: !cell.flagged };
        }),
      );
      playTone(420, 0.04, "square");
    },
    [playTone, status],
  );

  const clearMineLongPress = useCallback(() => {
    if (mineLongPressTimer.current !== null) {
      window.clearTimeout(mineLongPressTimer.current);
      mineLongPressTimer.current = null;
    }
  }, []);

  const handleMinePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
      if (event.button !== 0 || board[index]?.revealed || status === "won" || status === "lost") {
        return;
      }

      suppressMineClick.current = false;
      clearMineLongPress();
      event.currentTarget.setPointerCapture(event.pointerId);
      mineLongPressTimer.current = window.setTimeout(() => {
        suppressMineClick.current = true;
        toggleFlag(index);
      }, 430);
    },
    [board, clearMineLongPress, status, toggleFlag],
  );

  const handleMinePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      clearMineLongPress();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [clearMineLongPress],
  );

  const revealCell = useCallback(
    (index: number) => {
      if (status === "won" || status === "lost") {
        return;
      }

      if (flagMode) {
        toggleFlag(index);
        return;
      }

      setBoard((current) => {
        const activeBoard = status === "ready" ? createMineBoard(index) : current;
        const result = revealMineCell(activeBoard, index);

        if (result.hitMine) {
          setStatus("lost");
          playTone(150, 0.2, "sawtooth");
          return result.board;
        }

        if (boardIsWon(result.board)) {
          finishWin();
          return result.board;
        }

        if (status === "ready") {
          setStatus("running");
        }

        playTone(560, 0.035, "sine");
        return result.board;
      });
    },
    [finishWin, flagMode, playTone, status, toggleFlag],
  );

  const handleMineClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
      if (suppressMineClick.current) {
        event.preventDefault();
        suppressMineClick.current = false;
        return;
      }

      revealCell(index);
    },
    [revealCell],
  );

  useEffect(() => () => clearMineLongPress(), [clearMineLongPress]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status]);

  const statusLabel = {
    ready: "待开局",
    running: "搜寻中",
    won: "完成",
    lost: "踩雷",
  }[status];

  return (
    <section className="game-view mines-view">
      <GameHeader
        title="花园扫雷"
        image={ASSETS.minesStage}
        onBack={onBack}
        controls={
          <>
            <button
              className={`icon-button ${flagMode ? "icon-button--active" : ""}`}
              type="button"
              onClick={() => setFlagMode((value) => !value)}
              aria-label="切换旗帜模式"
              title="切换旗帜模式"
            >
              <Flag size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={resetGame}
              aria-label="重新开始"
              title="重新开始"
            >
              <RotateCcw size={20} />
            </button>
          </>
        }
      />

      <div className="play-layout">
        <aside className="game-panel">
          <div
            className="panel-art panel-art--mine"
            style={{ backgroundImage: `url(${ASSETS.minesStage})` }}
            aria-hidden="true"
          >
            <span className="panel-art-badge">
              <Flag size={17} />
            </span>
          </div>
          <div className="stat-strip">
            <Stat icon={<Timer size={18} />} label="用时" value={`${elapsed}s`} />
            <Stat icon={<Flag size={18} />} label="旗帜" value={`${flagsUsed}/${MINE_COUNT}`} />
            <Stat icon={<Trophy size={18} />} label="最佳" value={best ? `${best}s` : "--"} />
            <Stat icon={<Leaf size={18} />} label="状态" value={statusLabel} />
          </div>
          <button className="primary-action" type="button" onClick={resetGame}>
            新棋盘
          </button>
        </aside>

        <div className="board-shell mine-shell">
          <div className="mine-board" role="grid" aria-label="扫雷棋盘">
            {board.map((cell, index) => (
              <button
                key={index}
                className={[
                  "mine-cell",
                  cell.revealed ? "mine-cell--revealed" : "",
                  cell.flagged ? "mine-cell--flagged" : "",
                  cell.mine && cell.revealed ? "mine-cell--mine" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="button"
                onClick={(event) => handleMineClick(event, index)}
                onPointerDown={(event) => handleMinePointerDown(event, index)}
                onPointerUp={handleMinePointerEnd}
                onPointerCancel={handleMinePointerEnd}
                onPointerLeave={handleMinePointerEnd}
                onContextMenu={(event) => {
                  event.preventDefault();
                  toggleFlag(index);
                }}
                aria-label={`第 ${index + 1} 格`}
              >
                {cell.revealed && cell.mine && <Bomb size={19} strokeWidth={2.4} />}
                {cell.revealed && !cell.mine && cell.adjacent > 0 && (
                  <span className={`mine-number mine-number-${cell.adjacent}`}>
                    {cell.adjacent}
                  </span>
                )}
                {!cell.revealed && cell.flagged && <Flag size={17} strokeWidth={2.4} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MatchGame({ onBack, playTone }: { onBack: () => void; playTone: GameTone }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = MATCH_LEVELS[levelIndex];
  const [board, setBoard] = useState<MatchBoard>(() => createMatchGameBoard(level.kinds));
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(level.moves);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<MatchDragStart | null>(null);
  const [dragPreview, setDragPreview] = useState<MatchDragPreview | null>(null);
  const [swapMotion, setSwapMotion] = useState<MatchSwapMotion | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [fallStep, setFallStep] = useState(0);
  const [freshTileIds, setFreshTileIds] = useState<Set<number>>(() => new Set());
  const [tileSlideMotions, setTileSlideMotions] = useState<Map<number, Point>>(() => new Map());
  const [status, setStatus] = useState<MatchStatus>("playing");
  const [combo, setCombo] = useState(0);
  const [lastCreated, setLastCreated] = useState(0);
  const [matchEffects, setMatchEffects] = useState<MatchFx[]>([]);
  const [lastReward, setLastReward] = useState<MatchReward | null>(null);
  const [matchCoins, setMatchCoins] = useState(() => readNumber("lks.match.coins"));
  const [winStreak, setWinStreak] = useState(() => readNumber("lks.match.streak"));
  const [chestProgress, setChestProgress] = useState(() => readNumber("lks.match.chest"));
  const [best, setBest] = useState(() => readNumber("lks.match.best"));
  const matchTimers = useRef<number[]>([]);
  const matchFxId = useRef(0);
  const suppressNextMatchClick = useRef(false);
  const pendingSpecialTap = useRef<number | null>(null);

  const clearMatchTimers = useCallback(() => {
    matchTimers.current.forEach((timer) => window.clearTimeout(timer));
    matchTimers.current = [];

    if (pendingSpecialTap.current !== null) {
      window.clearTimeout(pendingSpecialTap.current);
      pendingSpecialTap.current = null;
    }
  }, []);

  const queueMatchTimer = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      matchTimers.current = matchTimers.current.filter((item) => item !== timer);
      callback();
    }, delay);

    matchTimers.current.push(timer);
  }, []);

  const launchMatchEffect = useCallback(
    (effect: Omit<MatchFx, "id">) => {
      matchFxId.current += 1;
      const id = matchFxId.current;

      setMatchEffects((current) => [...current, { ...effect, id }]);
      queueMatchTimer(() => {
        setMatchEffects((current) => current.filter((item) => item.id !== id));
      }, 720);
    },
    [queueMatchTimer],
  );

  useEffect(() => () => clearMatchTimers(), [clearMatchTimers]);

  const startLevel = useCallback(
    (nextLevelIndex = levelIndex) => {
      const nextLevel = MATCH_LEVELS[nextLevelIndex];

      clearMatchTimers();
      setLevelIndex(nextLevelIndex);
      setBoard(createMatchGameBoard(nextLevel.kinds));
      setScore(0);
      setMoves(nextLevel.moves);
      setSelected(null);
      setDragStart(null);
      setDragPreview(null);
      setSwapMotion(null);
      setTileSlideMotions(new Map());
      setIsResolving(false);
      setFallStep(0);
      setFreshTileIds(new Set());
      setTileSlideMotions(new Map());
      setStatus("playing");
      setCombo(0);
      setLastCreated(0);
      setMatchEffects([]);
      setLastReward(null);
    },
    [clearMatchTimers, levelIndex],
  );

  const finishMove = useCallback(
    (nextBoard: MatchTile[], gained: number, cascades: number, createdSpecials = 0) => {
      const nextScore = score + gained;
      const nextMoves = moves - 1;

      setBoard(nextBoard);
      setScore(nextScore);
      setMoves(nextMoves);
      setSelected(null);
      setDragStart(null);
      setDragPreview(null);
      setSwapMotion(null);
      setIsResolving(false);
      setFreshTileIds(new Set());
      setTileSlideMotions(new Map());
      setCombo(cascades);
      setLastCreated(createdSpecials);

      if (gained > 0) {
        playTone(680 + Math.min(cascades, 4) * 90, 0.08, "triangle");
      }

      if (nextScore > best) {
        setBest(nextScore);
        writeNumber("lks.match.best", nextScore);
      }

      if (nextScore >= level.target) {
        const reward = createMatchReward(level, nextScore, nextMoves, winStreak + 1, chestProgress);

        setLastReward(reward);
        setMatchCoins((current) => {
          const nextCoins = current + reward.coins;
          writeNumber("lks.match.coins", nextCoins);
          return nextCoins;
        });
        setWinStreak(reward.streak);
        writeNumber("lks.match.streak", reward.streak);
        setChestProgress(reward.chestProgress);
        writeNumber("lks.match.chest", reward.chestProgress);

        if (levelIndex < MATCH_LEVELS.length - 1) {
          setStatus("advancing");
          return;
        }

        setStatus("won");
        return;
      }

      if (nextMoves <= 0) {
        setLastReward(null);
        setWinStreak(0);
        writeNumber("lks.match.streak", 0);
        setStatus("lost");
        return;
      }

      setLastReward(null);
      setStatus(findPossibleMatchSwap(nextBoard) || boardHasUsableSpecial(nextBoard) ? "playing" : "stuck");
    },
    [best, chestProgress, level, levelIndex, moves, playTone, score, winStreak],
  );

  const playResolvedStages = useCallback(
    (
      resolved: ReturnType<typeof resolveMatchBoard>,
      extraGained = 0,
      minimumCascades = 0,
      initialBoard = board,
    ) => {
      let stageIndex = 0;
      let previousBoard = initialBoard;
      let previousIds = matchTileIdSet(initialBoard);

      const playNextStage = () => {
        const stage = resolved.stages[stageIndex];

        if (!stage) {
          queueMatchTimer(
            () =>
              finishMove(
                resolved.board,
                extraGained + resolved.gained,
                Math.max(minimumCascades, resolved.cascades),
                resolved.createdSpecials,
              ),
            MATCH_SETTLE_DELAY,
          );
          return;
        }

        const freshIds = freshMatchTileIds(previousIds, stage);

        setBoard(stage);
        setFreshTileIds(freshIds);
        setTileSlideMotions(matchTileSlideMotions(previousBoard, stage, freshIds));
        previousBoard = stage;
        previousIds = matchTileIdSet(stage);
        setFallStep((value) => value + 1);
        stageIndex += 1;
        queueMatchTimer(
          playNextStage,
          stage.some((tile) => !tile) ? MATCH_STAGE_CLEAR_DELAY : MATCH_STAGE_FILL_DELAY,
        );
      };

      if (resolved.stages.length === 0) {
        queueMatchTimer(
          () =>
            finishMove(
              resolved.board,
              extraGained + resolved.gained,
              Math.max(minimumCascades, resolved.cascades),
              resolved.createdSpecials,
            ),
          MATCH_SETTLE_DELAY,
        );
        return;
      }

      playNextStage();
    },
    [board, finishMove, queueMatchTimer],
  );

  const activateSpecialAt = useCallback(
    (index: number) => {
      if (status !== "playing" || isResolving || !matchBoardIsComplete(board)) {
        return;
      }

      const tile = board[index];

      if (!tile.special) {
        return;
      }

      setIsResolving(true);
      setSelected(null);
      setDragStart(null);
      setDragPreview(null);
      setSwapMotion(null);
      setTileSlideMotions(new Map());

      const targetKind = tile.special === "rainbow" ? mostCommonMatchKind(board) : undefined;
      const cleared = collectSpecialEffect(board, index, targetKind);
      const clearedIndexes = [...cleared];

      launchMatchEffect({
        origin: index,
        specials: [tile.special],
        cleared: clearedIndexes,
        combo: false,
      });
      playTone(760, 0.08, "triangle");

      queueMatchTimer(() => {
        const clearedBoard = board.map((candidate, candidateIndex) => (cleared.has(candidateIndex) ? null : candidate));

        setBoard(clearedBoard);
        setFallStep((value) => value + 1);

        queueMatchTimer(() => {
          const collapsed = collapseMatchBoard(board, cleared, level.kinds);
          const resolved = resolveMatchBoard(collapsed, level.kinds);

          playResolvedStages(
            {
              ...resolved,
              stages: [[...collapsed], ...resolved.stages],
            },
            cleared.size * 16,
            1,
            clearedBoard,
          );
        }, MATCH_STAGE_CLEAR_DELAY);
      }, MATCH_FX_CLEAR_DELAY);
    },
    [
      board,
      isResolving,
      launchMatchEffect,
      level.kinds,
      playResolvedStages,
      playTone,
      queueMatchTimer,
      status,
    ],
  );

  const trySwap = useCallback(
    (first: number, second: number) => {
      if (
        status !== "playing" ||
        isResolving ||
        first === second ||
        !indexesAreAdjacent(first, second) ||
        !matchBoardIsComplete(board)
      ) {
        return;
      }

      setIsResolving(true);
      setSelected(null);
      setDragStart(null);
      setDragPreview(null);
      setTileSlideMotions(new Map());
      const candidate = swapMatchTiles(board, first, second);
      setSwapMotion({ first, second, phase: "forward" });

      queueMatchTimer(() => {
        setBoard(candidate);
        setSwapMotion(null);
        const firstTile = candidate[first];
        const secondTile = candidate[second];
        const hasSpecialSwap = Boolean(firstTile.special || secondTile.special);

        if (hasSpecialSwap) {
          const cleared = collectSpecialComboEffect(candidate, first, second);
          const clearedIndexes = [...cleared];
          const specials = uniqueMatchSpecials([firstTile.special, secondTile.special]);

          launchMatchEffect({
            origin: first,
            target: second,
            specials,
            cleared: clearedIndexes,
            combo: specials.length > 1,
          });
          playTone(820, 0.1, "triangle");

          queueMatchTimer(() => {
            const clearedBoard = candidate.map((tile, index) => (cleared.has(index) ? null : tile));

            setBoard(clearedBoard);
            setFallStep((value) => value + 1);

            queueMatchTimer(() => {
              const collapsed = collapseMatchBoard(candidate, cleared, level.kinds);
              const resolved = resolveMatchBoard(collapsed, level.kinds);

              playResolvedStages(
                {
                  ...resolved,
                  stages: [[...collapsed], ...resolved.stages],
                },
                cleared.size * 20,
                1,
                clearedBoard,
              );
            }, MATCH_STAGE_CLEAR_DELAY);
          }, MATCH_FX_CLEAR_DELAY);
          return;
        }

        if (findMatchGroups(candidate).length === 0) {
          setCombo(0);
          setLastCreated(0);
          playTone(180, 0.08, "square");
          setSwapMotion({ first, second, phase: "back" });

          queueMatchTimer(() => {
            setBoard(board);
            setSwapMotion(null);
            setTileSlideMotions(new Map());
            setIsResolving(false);
          }, MATCH_SWAP_BACK_DELAY);
          return;
        }

        const resolved = resolveMatchBoard(candidate, level.kinds, second);
        playResolvedStages(resolved, 0, 0, candidate);
      }, MATCH_SWAP_DELAY);
    },
    [
      board,
      isResolving,
      launchMatchEffect,
      level.kinds,
      playResolvedStages,
      playTone,
      queueMatchTimer,
      status,
    ],
  );

  const handleTileClick = useCallback(
    (index: number) => {
      if (suppressNextMatchClick.current) {
        suppressNextMatchClick.current = false;
        return;
      }

      if (status !== "playing" || isResolving || !board[index]) {
        return;
      }

      if (pendingSpecialTap.current !== null) {
        window.clearTimeout(pendingSpecialTap.current);
        pendingSpecialTap.current = null;
      }

      if (selected === null) {
        if (board[index]?.special) {
          setSelected(index);
          playTone(560, 0.035, "sine");
          pendingSpecialTap.current = window.setTimeout(() => {
            pendingSpecialTap.current = null;
            activateSpecialAt(index);
          }, MATCH_SPECIAL_ARM_DELAY);
          return;
        }

        setSelected(index);
        playTone(520, 0.035, "sine");
        return;
      }

      if (selected === index) {
        if (board[index]?.special) {
          activateSpecialAt(index);
        } else {
          setSelected(null);
        }
        return;
      }

      if (!indexesAreAdjacent(selected, index)) {
        setSelected(index);
        playTone(460, 0.035, "sine");
        return;
      }

      trySwap(selected, index);
    },
    [activateSpecialAt, board, isResolving, playTone, selected, status, trySwap],
  );

  const handleTilePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (status !== "playing" || isResolving || dragStart === null) {
        return;
      }

      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      const isHorizontalDrag = Math.abs(deltaX) >= Math.abs(deltaY);
      const target = Math.hypot(deltaX, deltaY) >= 12
        ? adjacentIndexFromDelta(dragStart.index, deltaX, deltaY)
        : null;
      const maxOffset = event.currentTarget.getBoundingClientRect().width + 7;
      const rawX = target === null || isHorizontalDrag ? deltaX : 0;
      const rawY = target === null || !isHorizontalDrag ? deltaY : 0;
      const clampedX = Math.max(Math.min(rawX, maxOffset), -maxOffset);
      const clampedY = Math.max(Math.min(rawY, maxOffset), -maxOffset);

      if (Math.hypot(deltaX, deltaY) > 12) {
        setSelected(dragStart.index);
      }

      setDragPreview({ x: clampedX, y: clampedY, target });
    },
    [dragStart, isResolving, status],
  );

  const handleTilePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragStart) {
        return;
      }

      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      const shouldSwap = Math.hypot(deltaX, deltaY) >= 18;
      const targetIndex = shouldSwap
        ? adjacentIndexFromDelta(dragStart.index, deltaX, deltaY)
        : null;

      if (targetIndex !== null) {
        event.preventDefault();
        suppressNextMatchClick.current = true;
        trySwap(dragStart.index, targetIndex);
      }

      setDragStart(null);
      setDragPreview(null);
    },
    [dragStart, trySwap],
  );

  const nextLevel = useCallback(() => {
    startLevel((levelIndex + 1) % MATCH_LEVELS.length);
  }, [levelIndex, startLevel]);

  const reshuffleMatchBoard = useCallback(() => {
    const nextBoard = reshufflePlayableMatchBoard(board, level.kinds);
    const freshIds = freshMatchTileIds(matchTileIdSet(board), nextBoard);

    setBoard(nextBoard);
    setFreshTileIds(freshIds);
    setTileSlideMotions(matchTileSlideMotions(board, nextBoard, freshIds));
    setSelected(null);
    setDragStart(null);
    setDragPreview(null);
    setSwapMotion(null);
    setIsResolving(true);
    setFallStep((value) => value + 1);
    setStatus("settling");
    playTone(540, 0.08, "triangle");
    queueMatchTimer(() => {
      setIsResolving(false);
      setFreshTileIds(new Set());
      setTileSlideMotions(new Map());
      setStatus("playing");
    }, MATCH_STAGE_FILL_DELAY + MATCH_SETTLE_DELAY);
  }, [board, level.kinds, playTone, queueMatchTimer]);

  const statusLabel = {
    playing: "挑战中",
    advancing: "目标达成",
    won: "完成",
    lost: "步数用尽",
    stuck: "需要重排",
    settling: "整理中",
  }[status];
  const previewKinds = level.kinds.slice(0, 3);
  const themeNumber = (MATCH_LEVEL_TILE_SETS.findIndex((set) => set === level.tiles) + 1) || 1;
  const starTargets = matchStarTargets(level);
  const showMatchResult = status === "advancing" || status === "won" || status === "lost" || status === "stuck";
  const matchResultTitle =
    status === "advancing" ? "目标达成！" : status === "won" ? "成功！" : status === "stuck" ? "需要重排" : "步数用尽";
  const matchResultText =
    status === "advancing"
      ? `获得 ${lastReward?.coins ?? 0} 灵感币，整理棋盘，准备进入「${MATCH_LEVELS[levelIndex + 1]?.title ?? "下一关"}」。`
      : status === "won"
        ? `所有关卡都完成了，本轮共攒下 ${matchCoins} 灵感币。`
        : status === "stuck"
          ? "当前没有可用交换，点击重排后继续挑战。"
          : "目标变高了，试着多制造四消道具和连锁消除。";

  return (
    <section className={`game-view match-view match-view--level-${levelIndex + 1}`}>
      <GameHeader
        title="花瓣消消乐"
        image={ASSETS.arcadeHero}
        onBack={onBack}
        controls={
          <>
            <button
              className="icon-button"
              type="button"
              onClick={() => startLevel()}
              aria-label="重新开始"
              title="重新开始"
            >
              <RotateCcw size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={nextLevel}
              aria-label="下一关"
              title="下一关"
            >
              <Play size={20} />
            </button>
          </>
        }
      />

      <div className="play-layout">
        <aside className="game-panel match-panel">
          <div className="match-levels" aria-label="关卡">
            {MATCH_LEVELS.map((matchLevel, index) => (
              <button
                key={matchLevel.title}
                className={`level-chip ${index === levelIndex ? "level-chip--active" : ""}`}
                type="button"
                onClick={() => startLevel(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="match-preview" aria-hidden="true">
            {previewKinds.map((kind) => (
              <img key={kind} src={level.tiles[kind].image} alt="" />
            ))}
          </div>

          <div className="stat-strip">
            <Stat icon={<Trophy size={18} />} label="关卡" value={`${levelIndex + 1}/${MATCH_LEVELS.length}`} />
            <Stat icon={<Sparkles size={18} />} label="分数" value={score} />
            <Stat icon={<Timer size={18} />} label="步数" value={moves} />
            <Stat icon={<Trophy size={18} />} label="目标" value={level.target} />
            <Stat icon={<Flag size={18} />} label="难度" value={level.difficulty} />
            <Stat icon={<Leaf size={18} />} label="状态" value={statusLabel} />
            <Stat icon={<Circle size={18} />} label="二星" value={starTargets[1]} />
            <Stat icon={<Circle size={18} />} label="连锁" value={combo || "--"} />
            <Stat icon={<Bomb size={18} />} label="道具" value={lastCreated || "--"} />
            <Stat icon={<Sparkles size={18} />} label="灵感币" value={matchCoins} />
            <Stat icon={<Play size={18} />} label="连胜" value={winStreak || "--"} />
            <Stat icon={<Trophy size={18} />} label="宝箱" value={`${chestProgress}/${MATCH_CHEST_GOAL}`} />
            <Stat icon={<Trophy size={18} />} label="最高" value={best} />
          </div>

          <button
            className="primary-action"
            type="button"
            onClick={status === "advancing" ? nextLevel : status === "stuck" ? reshuffleMatchBoard : () => startLevel()}
          >
            {status === "advancing" ? "下一关" : status === "stuck" ? "重排棋盘" : "重开本关"}
          </button>
        </aside>

        <div className="board-shell match-shell">
          <div
            className={[
              "match-board",
              `match-board--theme-${themeNumber}`,
              isResolving ? "match-board--resolving" : "",
              status === "settling" ? "match-board--settling" : "",
              showMatchResult ? "match-board--paused" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role="grid"
            aria-label="花瓣消消乐棋盘"
          >
            {board.map((cell, index) => {
              const tile = cell?.special ? MATCH_SPECIAL_TILES[cell.special] : cell ? level.tiles[cell.kind] : null;
              const isDragging = dragStart?.index === index && Boolean(dragPreview);
              const isDisplaced = dragPreview?.target === index && dragStart !== null;
              const motionTarget =
                swapMotion && index === swapMotion.first
                  ? swapMotion.second
                  : swapMotion && index === swapMotion.second
                    ? swapMotion.first
                    : null;
              const motionDelta =
                motionTarget !== null
                  ? {
                      x: matchCol(motionTarget) - matchCol(index),
                      y: matchRow(motionTarget) - matchRow(index),
                    }
                  : null;
              const slideMotion = cell ? tileSlideMotions.get(cell.id) : undefined;
              const cellStyle = {
                ...(isDragging && dragPreview
                  ? {
                      "--drag-x": `${dragPreview.x}px`,
                      "--drag-y": `${dragPreview.y}px`,
                    }
                  : {}),
                ...(isDisplaced && dragPreview
                  ? {
                      "--push-x": `${Math.round(-dragPreview.x * 0.82)}px`,
                      "--push-y": `${Math.round(-dragPreview.y * 0.82)}px`,
                    }
                  : {}),
                ...(motionDelta
                  ? {
                      "--swap-x": `calc((var(--match-cell) + 7px) * ${motionDelta.x})`,
                      "--swap-y": `calc((var(--match-cell) + 7px) * ${motionDelta.y})`,
                    }
                  : {}),
                ...(slideMotion
                  ? {
                      "--slide-x": `calc((var(--match-cell) + 7px) * ${slideMotion.x})`,
                      "--slide-y": `calc((var(--match-cell) + 7px) * ${slideMotion.y})`,
                    }
                  : {}),
              } as React.CSSProperties;

              return (
                <button
                  key={cell?.id ?? `empty-${index}-${fallStep}`}
                  className={[
                    "match-cell",
                    !cell ? "match-cell--empty" : "",
                    selected === index ? "match-cell--selected" : "",
                    selected === index && cell?.special ? "match-cell--armed-special" : "",
                    isDragging ? "match-cell--dragging" : "",
                    isDisplaced ? "match-cell--displaced" : "",
                    motionTarget !== null ? `match-cell--swap-motion match-cell--swap-${swapMotion?.phase}` : "",
                    cell && slideMotion ? "match-cell--slide-motion" : "",
                    cell && freshTileIds.has(cell.id) ? "match-cell--fresh" : "",
                    cell?.special ? `match-cell--special match-cell--special-${cell.special}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  data-match-index={index}
                  data-match-kind={cell?.kind ?? ""}
                  data-match-special={cell?.special ?? ""}
                  style={cellStyle}
                  onClick={() => handleTileClick(index)}
                  onPointerDown={(event) => {
                    if (status === "playing" && !isResolving && cell) {
                      if (pendingSpecialTap.current !== null) {
                        window.clearTimeout(pendingSpecialTap.current);
                        pendingSpecialTap.current = null;
                      }

                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDragStart({ index, x: event.clientX, y: event.clientY });
                      setDragPreview({ x: 0, y: 0, target: null });
                    }
                  }}
                  onPointerUp={handleTilePointerUp}
                  onPointerCancel={() => setDragStart(null)}
                  onPointerMove={handleTilePointerMove}
                  disabled={status !== "playing" || isResolving || !cell}
                  aria-label={tile?.label ?? "已消除"}
                >
                  {tile && <img src={tile.image} alt="" draggable={false} />}
                </button>
              );
            })}
            {matchEffects.length > 0 && (
              <div className="match-fx-layer" aria-hidden="true">
                {matchEffects.map((effect) => {
                  const rowBeams =
                    effect.specials.includes("row")
                      ? fullMatchRows(effect.cleared).length > 0
                        ? fullMatchRows(effect.cleared)
                        : [matchRow(effect.origin)]
                      : [];
                  const colBeams =
                    effect.specials.includes("col")
                      ? fullMatchCols(effect.cleared).length > 0
                        ? fullMatchCols(effect.cleared)
                        : [matchCol(effect.origin)]
                      : [];

                  return (
                    <div
                      key={effect.id}
                      className={[
                        "match-fx",
                        effect.combo ? "match-fx--combo" : "",
                        effect.specials.includes("rainbow") ? "match-fx--rainbow" : "",
                        effect.specials.includes("bomb") ? "match-fx--bomb" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="match-fx-flash" />
                      {effect.specials.includes("rainbow") && <span className="match-fx-aurora" />}
                      <span
                        className="match-fx-origin"
                        style={
                          {
                            "--fx-row": matchRow(effect.origin),
                            "--fx-col": matchCol(effect.origin),
                          } as React.CSSProperties
                        }
                      />
                      {effect.target !== undefined && (
                        <span
                          className="match-fx-origin match-fx-origin--target"
                          style={
                            {
                              "--fx-row": matchRow(effect.target),
                              "--fx-col": matchCol(effect.target),
                            } as React.CSSProperties
                          }
                        />
                      )}
                      {rowBeams.map((row) => (
                        <span
                          key={`row-${row}`}
                          className="match-fx-beam match-fx-beam--row"
                          style={{ "--fx-row": row } as React.CSSProperties}
                        />
                      ))}
                      {colBeams.map((col) => (
                        <span
                          key={`col-${col}`}
                          className="match-fx-beam match-fx-beam--col"
                          style={{ "--fx-col": col } as React.CSSProperties}
                        />
                      ))}
                      {effect.specials.includes("bomb") && (
                        <span
                          className="match-fx-shockwave"
                          style={
                            {
                              "--fx-row": matchRow(effect.origin),
                              "--fx-col": matchCol(effect.origin),
                            } as React.CSSProperties
                          }
                        />
                      )}
                      {effect.cleared.map((index, burstIndex) => (
                        <span
                          key={index}
                          className="match-fx-pop"
                          style={
                            {
                              "--fx-row": matchRow(index),
                              "--fx-col": matchCol(index),
                              "--fx-delay": `${(burstIndex % 9) * 18}ms`,
                            } as React.CSSProperties
                          }
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {showMatchResult && (
            <div className={`match-result match-result--${status}`} role="status" aria-live="polite">
              <span className="match-result-badge">
                {status === "lost" ? "再来" : status === "stuck" ? "重排" : "达成"}
              </span>
              <h3>{matchResultTitle}</h3>
              {lastReward && status !== "lost" && status !== "stuck" && (
                <div className="match-stars" aria-label={`${lastReward.stars} 星评价`}>
                  {[0, 1, 2].map((star) => (
                    <span
                      key={star}
                      className={`match-star ${star < lastReward.stars ? "match-star--filled" : ""}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              )}
              <p>{matchResultText}</p>
              <div className="match-result-stats">
                <span>分数 {score}</span>
                <span>目标 {level.target}</span>
                {lastReward && status !== "lost" && status !== "stuck" && (
                  <>
                    <span>奖励 +{lastReward.coins} 灵感币</span>
                    <span>连胜 {lastReward.streak}</span>
                    <span>宝箱 +{lastReward.chestGain}</span>
                    {lastReward.chestOpened && <span>宝箱开启 +{lastReward.chestBonus}</span>}
                  </>
                )}
                {status === "lost" && <span>二星目标 {starTargets[1]}</span>}
              </div>
              <button
                className="primary-action"
                type="button"
                onClick={
                  status === "advancing"
                    ? nextLevel
                    : status === "won"
                      ? () => startLevel(0)
                      : status === "stuck"
                        ? reshuffleMatchBoard
                        : () => startLevel()
                }
              >
                {status === "advancing" ? "下一关" : status === "won" ? "再玩一轮" : status === "stuck" ? "重排棋盘" : "再试一次"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LinkGame({ onBack, playTone }: { onBack: () => void; playTone: GameTone }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LINK_LEVELS[levelIndex];
  const [board, setBoard] = useState<LinkCell[]>(() => createLinkBoard(level.kinds));
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<LinkStatus>("playing");
  const [hintPair, setHintPair] = useState<[number, number] | null>(null);
  const [linkPath, setLinkPath] = useState<Point[] | null>(null);
  const [missPair, setMissPair] = useState<[number, number] | null>(null);
  const [best, setBest] = useState(() => readNumber("lks.link.best"));
  const linkTimers = useRef<number[]>([]);
  const remainingTiles = board.filter((cell) => !cell.removed).length;
  const matchedPairs = (LINK_ROWS * LINK_COLS - remainingTiles) / 2;
  const linkPathPoints = useMemo(
    () => linkPath?.map((point) => `${point.x + 0.5},${point.y + 0.5}`).join(" ") ?? "",
    [linkPath],
  );

  const clearLinkTimers = useCallback(() => {
    linkTimers.current.forEach((timer) => window.clearTimeout(timer));
    linkTimers.current = [];
  }, []);

  const queueLinkTimer = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      linkTimers.current = linkTimers.current.filter((item) => item !== timer);
      callback();
    }, delay);

    linkTimers.current.push(timer);
  }, []);

  useEffect(() => () => clearLinkTimers(), [clearLinkTimers]);

  const startLevel = useCallback(
    (nextLevelIndex = levelIndex) => {
      const nextLevel = LINK_LEVELS[nextLevelIndex];

      clearLinkTimers();
      setLevelIndex(nextLevelIndex);
      setBoard(createLinkBoard(nextLevel.kinds));
      setSelected(null);
      setScore(0);
      setCombo(0);
      setStatus("playing");
      setHintPair(null);
      setLinkPath(null);
      setMissPair(null);
    },
    [clearLinkTimers, levelIndex],
  );

  const nextLevel = useCallback(() => {
    startLevel((levelIndex + 1) % LINK_LEVELS.length);
  }, [levelIndex, startLevel]);

  const shuffleBoard = useCallback(() => {
    const next = shuffleRemainingLinkBoard(board);
    const hasRemaining = next.some((cell) => !cell.removed);
    const hasMove = hasRemaining ? Boolean(findAvailableLinkPair(next)) : false;

    setBoard(next);
    setSelected(null);
    setCombo(0);
    setHintPair(null);
    setLinkPath(null);
    setMissPair(null);
    setStatus(!hasRemaining ? "won" : hasMove ? "playing" : "stuck");
    playTone(420, 0.08, "triangle");
  }, [board, playTone]);

  const showHint = useCallback(() => {
    const pair = findAvailableLinkPair(board);

    if (!pair) {
      setStatus("stuck");
      playTone(180, 0.08, "square");
      return;
    }

    setHintPair([pair.first, pair.second]);
    setLinkPath(pair.path);
    setMissPair(null);
    playTone(760, 0.06, "sine");
    clearLinkTimers();
    queueLinkTimer(() => setLinkPath(null), 900);
  }, [board, clearLinkTimers, playTone, queueLinkTimer]);

  const handleCellClick = useCallback(
    (index: number) => {
      const cell = board[index];

      if (status !== "playing" || !cell || cell.removed) {
        return;
      }

      setHintPair(null);
      setLinkPath(null);
      setMissPair(null);

      if (selected === null) {
        setSelected(index);
        playTone(520, 0.035, "sine");
        return;
      }

      if (selected === index) {
        setSelected(null);
        return;
      }

      const path = findLinkPath(board, selected, index);

      if (!path) {
        setMissPair([selected, index]);
        setSelected(index);
        setCombo(0);
        playTone(190, 0.07, "square");
        clearLinkTimers();
        queueLinkTimer(() => setMissPair(null), 320);
        return;
      }

      const nextBoard = board.map((candidate, candidateIndex) =>
        candidateIndex === selected || candidateIndex === index
          ? { ...candidate, removed: true }
          : candidate,
      );
      const nextCombo = combo + 1;
      const gained = 36 + Math.min(nextCombo, 8) * 8;
      const nextScore = score + gained;
      const hasRemaining = nextBoard.some((candidate) => !candidate.removed);
      const hasMove = hasRemaining ? Boolean(findAvailableLinkPair(nextBoard)) : false;

      setBoard(nextBoard);
      setScore(nextScore);
      setCombo(nextCombo);
      setSelected(null);
      setLinkPath(path);
      setMissPair(null);
      clearLinkTimers();
      queueLinkTimer(() => setLinkPath(null), 420);
      playTone(700 + Math.min(nextCombo, 5) * 55, 0.07, "triangle");

      if (!hasRemaining) {
        setStatus("won");

        if (nextScore > best) {
          setBest(nextScore);
          writeNumber("lks.link.best", nextScore);
        }

        return;
      }

      if (!hasMove) {
        setStatus("stuck");
      }
    },
    [best, board, clearLinkTimers, combo, playTone, queueLinkTimer, score, selected, status],
  );

  const statusLabel = {
    playing: "挑战中",
    won: "清空",
    stuck: "待重排",
  }[status];

  return (
    <section className="game-view link-view">
      <GameHeader
        title="问答连连看"
        image={ASSETS.arcadeHero}
        onBack={onBack}
        controls={
          <>
            <button
              className="icon-button"
              type="button"
              onClick={() => startLevel()}
              aria-label="重新开始"
              title="重新开始"
            >
              <RotateCcw size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={showHint}
              aria-label="提示"
              title="提示"
            >
              <Lightbulb size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={shuffleBoard}
              aria-label="重排"
              title="重排"
            >
              <Shuffle size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={nextLevel}
              aria-label="下一关"
              title="下一关"
            >
              <Play size={20} />
            </button>
          </>
        }
      />

      <div className="play-layout">
        <aside className="game-panel link-panel">
          <div className="match-levels" aria-label="关卡">
            {LINK_LEVELS.map((linkLevel, index) => (
              <button
                key={linkLevel.title}
                className={`level-chip ${index === levelIndex ? "level-chip--active" : ""}`}
                type="button"
                onClick={() => startLevel(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="link-preview" aria-hidden="true">
            <img src={MATCH_TILES.kanshan.image} alt="" />
            <span className="link-preview-line" />
            <img src={MATCH_TILES.kanshanPetal.image} alt="" />
          </div>

          <div className="stat-strip">
            <Stat icon={<Sparkles size={18} />} label="分数" value={score} />
            <Stat icon={<Link2 size={18} />} label="配对" value={`${matchedPairs}/${(LINK_ROWS * LINK_COLS) / 2}`} />
            <Stat icon={<Circle size={18} />} label="剩余" value={remainingTiles} />
            <Stat icon={<Leaf size={18} />} label="状态" value={statusLabel} />
            <Stat icon={<Timer size={18} />} label="连击" value={combo || "--"} />
            <Stat icon={<Trophy size={18} />} label="最高" value={best} />
          </div>

          <button
            className="primary-action"
            type="button"
            onClick={status === "stuck" ? shuffleBoard : nextLevel}
          >
            {status === "stuck" ? "重新排布" : level.title}
          </button>
        </aside>

        <div className="board-shell link-shell">
          <div className="link-board" role="grid" aria-label="问答连连看棋盘">
            {linkPath && (
              <svg
                className="link-path-layer"
                viewBox="-0.5 -0.5 9 8"
                aria-hidden="true"
                focusable="false"
              >
                <polyline className="link-path-glow" points={linkPathPoints} />
                <polyline className="link-path-line" points={linkPathPoints} />
              </svg>
            )}
            {board.map((cell, index) => {
              const tile = MATCH_TILES[cell.kind];
              const isSelected = selected === index;
              const isHinted = hintPair?.includes(index) ?? false;
              const isMiss = missPair?.includes(index) ?? false;

              return (
                <button
                  key={cell.id}
                  className={[
                    "link-cell",
                    `link-cell--${cell.side}`,
                    isSelected ? "link-cell--selected" : "",
                    isHinted ? "link-cell--hint" : "",
                    isMiss ? "link-cell--miss" : "",
                    cell.removed ? "link-cell--removed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  data-link-index={index}
                  data-link-pair={cell.pairId}
                  data-link-side={cell.side}
                  data-link-kind={cell.kind}
                  onClick={() => handleCellClick(index)}
                  disabled={cell.removed || status === "won"}
                  aria-label={
                    cell.removed
                      ? "已消除"
                      : `${cell.side === "question" ? "问题" : "答案"}：${cell.text}`
                  }
                >
                  {!cell.removed && (
                    <>
                      <span className="link-cell-badge">
                        {cell.side === "question" ? "问" : "答"}
                      </span>
                      <img className="link-cell-art" src={tile.image} alt="" draggable={false} />
                      <span className="link-cell-text">{cell.text}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function BubbleGame({ onBack, playTone }: { onBack: () => void; playTone: GameTone }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = BUBBLE_LEVELS[levelIndex];
  const [board, setBoard] = useState<Array<BubbleCell | null>>(() =>
    createBubbleBoard(level.kinds, level.filledRows),
  );
  const [currentKind, setCurrentKind] = useState<MatchKind>(() => randomBubbleKind(level.kinds));
  const [nextKind, setNextKind] = useState<MatchKind>(() => randomBubbleKind(level.kinds));
  const [aimAngle, setAimAngle] = useState(0);
  const [shots, setShots] = useState(level.shots);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<BubbleStatus>("playing");
  const [bubbleShot, setBubbleShot] = useState<BubbleShot | null>(null);
  const [bubbleFlightPosition, setBubbleFlightPosition] = useState<Point | null>(null);
  const [bubbleImpact, setBubbleImpact] = useState<number | null>(null);
  const [best, setBest] = useState(() => readNumber("lks.bubble.best"));
  const bubbleTimers = useRef<number[]>([]);
  const bubbleFlightFrame = useRef<number | null>(null);
  const bubblePointerActive = useRef(false);
  const suppressBubbleClick = useRef(false);
  const remainingBubbles = board.filter(Boolean).length;

  const cancelBubbleFlight = useCallback(() => {
    if (bubbleFlightFrame.current !== null) {
      window.cancelAnimationFrame(bubbleFlightFrame.current);
      bubbleFlightFrame.current = null;
    }
  }, []);

  const clearBubbleTimers = useCallback(() => {
    bubbleTimers.current.forEach((timer) => window.clearTimeout(timer));
    bubbleTimers.current = [];
    cancelBubbleFlight();
  }, [cancelBubbleFlight]);

  const queueBubbleTimer = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      bubbleTimers.current = bubbleTimers.current.filter((item) => item !== timer);
      callback();
    }, delay);

    bubbleTimers.current.push(timer);
  }, []);

  useEffect(() => () => clearBubbleTimers(), [clearBubbleTimers]);

  const startLevel = useCallback(
    (nextLevelIndex = levelIndex) => {
      const nextLevel = BUBBLE_LEVELS[nextLevelIndex];

      clearBubbleTimers();
      setLevelIndex(nextLevelIndex);
      setBoard(createBubbleBoard(nextLevel.kinds, nextLevel.filledRows));
      setCurrentKind(randomBubbleKind(nextLevel.kinds));
      setNextKind(randomBubbleKind(nextLevel.kinds));
      setAimAngle(0);
      setShots(nextLevel.shots);
      setScore(0);
      setCombo(0);
      setStatus("playing");
      setBubbleShot(null);
      setBubbleFlightPosition(null);
      setBubbleImpact(null);
    },
    [clearBubbleTimers, levelIndex],
  );

  const finishScore = useCallback(
    (nextScore: number) => {
      if (nextScore > best) {
        setBest(nextScore);
        writeNumber("lks.bubble.best", nextScore);
      }
    },
    [best],
  );

  const shootBubble = useCallback(
    (shotAngle = aimAngle) => {
      if (status !== "playing" || bubbleShot) {
        return;
      }

      const placed = traceBubbleShot(board, shotAngle, currentKind);

      if (!placed) {
        setStatus("lost");
        setCombo(0);
        playTone(160, 0.1, "square");
        return;
      }

      const shotKind = currentKind;
      const shotDuration = Math.min(820, Math.max(360, placed.distance * 74));

      setBubbleShot({
        id: Date.now(),
        kind: shotKind,
        targetIndex: placed.index,
        distance: placed.distance,
        path: placed.path,
      });
      cancelBubbleFlight();
      setBubbleFlightPosition(placed.path[0]);
      setBubbleImpact(null);
      playTone(520, 0.045, "triangle");

      const startedAt = window.performance.now();
      const playFlight = (now: number) => {
        const progress = clampValue((now - startedAt) / shotDuration, 0, 1);
        setBubbleFlightPosition(bubblePointAlongPath(placed.path, placed.distance * progress));

        if (progress < 1) {
          bubbleFlightFrame.current = window.requestAnimationFrame(playFlight);
          return;
        }

        bubbleFlightFrame.current = null;
      };

      bubbleFlightFrame.current = window.requestAnimationFrame(playFlight);

      queueBubbleTimer(() => {
        cancelBubbleFlight();
        const resolved = resolveBubbleShot(placed.board, placed.index);
        const nextShots = shots - 1;
        const nextCombo = resolved.popped > 0 ? combo + 1 : 0;
        const gained =
          10 +
          resolved.popped * 28 +
          resolved.dropped * 42 +
          (resolved.popped > 0 ? Math.min(nextCombo, 6) * 14 : 0);
        const nextScore = score + gained;
        const nextBoard = resolved.board;
        const hasRemaining = nextBoard.some(Boolean);
        const reachesBottom = bubbleBoardTouchesKillLine(nextBoard);

        setBoard(nextBoard);
        setScore(nextScore);
        setShots(nextShots);
        setCombo(nextCombo);
        setCurrentKind(nextKind);
        setNextKind(randomBubbleKind(level.kinds));
        setBubbleShot(null);
        setBubbleFlightPosition(null);
        setBubbleImpact(placed.index);
        queueBubbleTimer(() => setBubbleImpact(null), 280);

        if (resolved.popped > 0) {
          playTone(720 + Math.min(nextCombo, 5) * 70, 0.08, "triangle");
        } else {
          playTone(430, 0.055, "sine");
        }

        if (!hasRemaining) {
          setStatus("won");
          finishScore(nextScore);
          return;
        }

        if (nextShots <= 0 || reachesBottom) {
          setStatus("lost");
          finishScore(nextScore);
        }
      }, shotDuration);
    },
    [
      aimAngle,
      board,
      bubbleShot,
      cancelBubbleFlight,
      combo,
      currentKind,
      finishScore,
      level.kinds,
      nextKind,
      playTone,
      queueBubbleTimer,
      score,
      shots,
      status,
    ],
  );

  const nextLevel = useCallback(() => {
    startLevel((levelIndex + 1) % BUBBLE_LEVELS.length);
  }, [levelIndex, startLevel]);

  const calculateBubbleAimAngle = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cannonSlot = event.currentTarget.querySelector<HTMLElement>(
      `[data-bubble-row="0"][data-bubble-col="${BUBBLE_CANNON_X}"]`,
    );
    const cannonSlotRect = cannonSlot?.getBoundingClientRect();
    const originX = cannonSlotRect
      ? cannonSlotRect.left + cannonSlotRect.width / 2 - rect.left
      : rect.width / 2;
    const originY = rect.height - 88;
    const dx = event.clientX - rect.left - originX;
    const dy = Math.max(18, originY - (event.clientY - rect.top));
    const nextAngle = (Math.atan2(dx, dy) * 180) / Math.PI;

    return clampValue(nextAngle, -BUBBLE_AIM_LIMIT, BUBBLE_AIM_LIMIT);
  }, []);

  const handleBubblePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (status !== "playing" || bubbleShot) {
        return;
      }

      setAimAngle(calculateBubbleAimAngle(event));
    },
    [bubbleShot, calculateBubbleAimAngle, status],
  );

  const handleBubblePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (status !== "playing" || bubbleShot) {
        return;
      }

      event.preventDefault();
      bubblePointerActive.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setAimAngle(calculateBubbleAimAngle(event));
    },
    [bubbleShot, calculateBubbleAimAngle, status],
  );

  const handleBubblePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!bubblePointerActive.current) {
        return;
      }

      event.preventDefault();
      const shotAngle = calculateBubbleAimAngle(event);
      bubblePointerActive.current = false;
      suppressBubbleClick.current = true;
      setAimAngle(shotAngle);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      shootBubble(shotAngle);
    },
    [calculateBubbleAimAngle, shootBubble],
  );

  const handleBubblePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    bubblePointerActive.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const statusLabel = {
    playing: "发射中",
    won: "清空",
    lost: "结束",
  }[status];
  const bubbleFlightRow = bubbleFlightPosition ? bubbleFlightPosition.y / BUBBLE_ROW_STEP : 0;

  return (
    <section className="game-view bubble-view">
      <GameHeader
        title="泡泡灵感机"
        image={ASSETS.arcadeHero}
        onBack={onBack}
        controls={
          <>
            <button
              className="icon-button"
              type="button"
              onClick={() => startLevel()}
              aria-label="重新开始"
              title="重新开始"
            >
              <RotateCcw size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={nextLevel}
              aria-label="下一关"
              title="下一关"
            >
              <Play size={20} />
            </button>
          </>
        }
      />

      <div className="play-layout">
        <aside className="game-panel bubble-panel">
          <div className="match-levels" aria-label="关卡">
            {BUBBLE_LEVELS.map((bubbleLevel, index) => (
              <button
                key={bubbleLevel.title}
                className={`level-chip ${index === levelIndex ? "level-chip--active" : ""}`}
                type="button"
                onClick={() => startLevel(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="bubble-preview" aria-hidden="true">
            <img className="bubble-preview-mascot" src={ASSETS.kanshanHead} alt="" />
            <span className="bubble-preview-orbit">
              <img src={MATCH_TILES[currentKind].image} alt="" />
            </span>
            <span className="bubble-preview-next">
              <img src={MATCH_TILES[nextKind].image} alt="" />
            </span>
          </div>

          <div className="stat-strip">
            <Stat icon={<Sparkles size={18} />} label="分数" value={score} />
            <Stat icon={<Timer size={18} />} label="发射" value={shots} />
            <Stat icon={<Circle size={18} />} label="剩余" value={remainingBubbles} />
            <Stat icon={<Leaf size={18} />} label="状态" value={statusLabel} />
            <Stat icon={<Bomb size={18} />} label="连击" value={combo || "--"} />
            <Stat icon={<Trophy size={18} />} label="最高" value={best} />
          </div>

          {status === "playing" ? (
            <div className="primary-action primary-action--static" aria-live="polite">
              {level.title}
            </div>
          ) : (
            <button className="primary-action" type="button" onClick={nextLevel}>
              下一关
            </button>
          )}
        </aside>

        <div className="board-shell bubble-shell">
          <div
            className={`bubble-board ${bubbleShot ? "bubble-board--shooting" : ""}`}
            role="grid"
            aria-label="泡泡灵感机棋盘"
            style={
              {
                "--aim-angle": `${aimAngle}deg`,
                "--bubble-cannon-x": BUBBLE_CANNON_X,
              } as React.CSSProperties
            }
            onPointerDown={handleBubblePointerDown}
            onPointerMove={handleBubblePointerMove}
            onPointerUp={handleBubblePointerEnd}
            onPointerCancel={handleBubblePointerCancel}
            onPointerLeave={handleBubblePointerCancel}
            onClick={(event) => {
              if (suppressBubbleClick.current) {
                suppressBubbleClick.current = false;
                return;
              }

              if (event.target === event.currentTarget) {
                shootBubble();
              }
            }}
          >
            <span className="bubble-kill-line" aria-hidden="true" />
            {bubbleShot && bubbleFlightPosition && (
              <span
                key={bubbleShot.id}
                className="bubble-shot"
                data-bubble-kind={bubbleShot.kind}
                aria-hidden="true"
                style={
                  {
                    "--flight-x": bubbleFlightPosition.x,
                    "--flight-row": bubbleFlightRow,
                  } as React.CSSProperties
                }
              >
                <img src={MATCH_TILES[bubbleShot.kind].image} alt="" draggable={false} />
              </span>
            )}
            {board.map((cell, index) => {
              const { row, col } = bubbleCoords(index);
              const isPlayable = bubbleSlotIsPlayable(row, col);
              const isImpact = bubbleImpact === index;
              const isDanger = Boolean(cell && row >= BUBBLE_KILL_ROW);

              return (
                <button
                  key={cell?.id ?? `empty-${index}`}
                  className={[
                    "bubble-slot",
                    !isPlayable ? "bubble-slot--void" : "",
                    row % 2 === 1 ? "bubble-slot--offset" : "",
                    isImpact ? "bubble-slot--impact" : "",
                    isDanger ? "bubble-slot--danger" : "",
                    cell ? "bubble-slot--filled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  data-bubble-index={index}
                  data-bubble-row={row}
                  data-bubble-col={col}
                  data-bubble-kind={cell?.kind ?? ""}
                  onClick={(event) => {
                    if (suppressBubbleClick.current) {
                      event.preventDefault();
                      suppressBubbleClick.current = false;
                      return;
                    }

                    shootBubble();
                  }}
                  disabled={!isPlayable || status !== "playing" || Boolean(bubbleShot)}
                  aria-hidden={!isPlayable ? true : undefined}
                  aria-label={cell ? MATCH_TILES[cell.kind].label : `瞄准第 ${col + 1} 列`}
                >
                  {cell && <img src={MATCH_TILES[cell.kind].image} alt="" draggable={false} />}
                </button>
              );
            })}
            <div className="bubble-cannon" aria-hidden="true">
              <span className="bubble-cannon-rotor">
                <span className="bubble-aim-ray" />
                <span className="bubble-cannon-base" />
                <span
                  className={`bubble-current ${bubbleShot ? "bubble-current--empty" : ""}`}
                  data-bubble-kind={currentKind}
                >
                  <img src={MATCH_TILES[currentKind].image} alt="" />
                </span>
              </span>
              <span className="bubble-cannon-mascot">
                <img className="bubble-cannon-kanshan" src={ASSETS.kanshanBubbleOperator} alt="" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FishingGame({ onBack, playTone }: { onBack: () => void; playTone: GameTone }) {
  const [phase, setPhase] = useState<FishingPhase>("ready");
  const [castPower, setCastPower] = useState(54);
  const [bobber, setBobber] = useState({ x: 58, y: 58 });
  const [targetFish, setTargetFish] = useState<FishingFish | null>(null);
  const [caughtFish, setCaughtFish] = useState<FishingFish | null>(null);
  const [message, setMessage] = useState("选好力度，抛到有鱼影的水面。");
  const [tension, setTension] = useState(34);
  const [reelProgress, setReelProgress] = useState(0);
  const [sweetSpot, setSweetSpot] = useState(42);
  const [holdingReel, setHoldingReel] = useState(false);
  const [coins, setCoins] = useState(() => readNumber("lks.fishing.coins"));
  const [best, setBest] = useState(() => readNumber("lks.fishing.best"));
  const [caughtIds, setCaughtIds] = useState<Set<string>>(
    () => new Set(readStringArray("lks.fishing.caught")),
  );
  const fishingTimers = useRef<number[]>([]);
  const phaseRef = useRef(phase);
  const targetFishRef = useRef<FishingFish | null>(targetFish);
  const tensionRef = useRef(tension);
  const progressRef = useRef(reelProgress);
  const holdingReelRef = useRef(holdingReel);
  const overTensionTicksRef = useRef(0);
  const reelTapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    targetFishRef.current = targetFish;
  }, [targetFish]);

  useEffect(() => {
    holdingReelRef.current = holdingReel;
  }, [holdingReel]);

  const clearFishingTimers = useCallback(() => {
    fishingTimers.current.forEach((timer) => window.clearTimeout(timer));
    fishingTimers.current = [];
  }, []);

  const queueFishingTimer = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      fishingTimers.current = fishingTimers.current.filter((item) => item !== timer);
      callback();
    }, delay);

    fishingTimers.current.push(timer);
  }, []);

  useEffect(() => () => clearFishingTimers(), [clearFishingTimers]);

  const resetFishing = useCallback(() => {
    clearFishingTimers();
    phaseRef.current = "ready";
    setPhase("ready");
    setBobber({ x: 58, y: 58 });
    setTargetFish(null);
    setCaughtFish(null);
    setMessage("选好力度，抛到有鱼影的水面。");
    setTension(34);
    setReelProgress(0);
    setSweetSpot(42);
    setHoldingReel(false);
    overTensionTicksRef.current = 0;
    reelTapTimesRef.current = [];
  }, [clearFishingTimers]);

  const finishEscape = useCallback(
    (nextMessage: string) => {
      phaseRef.current = "escaped";
      setPhase("escaped");
      setHoldingReel(false);
      setTension(24);
      setReelProgress(0);
      overTensionTicksRef.current = 0;
      reelTapTimesRef.current = [];
      setMessage(nextMessage);
      playTone(180, 0.12, "sawtooth");
    },
    [playTone],
  );

  const finishCatch = useCallback(
    (fish: FishingFish) => {
      phaseRef.current = "caught";
      setPhase("caught");
      setHoldingReel(false);
      setCaughtFish(fish);
      setTargetFish(fish);
      setTension(46);
      setReelProgress(100);
      reelTapTimesRef.current = [];
      setMessage(`钓到了 ${fish.name}，获得 ${fish.price} 灵感币。`);
      setCoins((value) => {
        const next = value + fish.price;
        writeNumber("lks.fishing.coins", next);
        return next;
      });
      setBest((value) => {
        const next = Math.max(value, fish.price);
        writeNumber("lks.fishing.best", next);
        return next;
      });
      setCaughtIds((value) => {
        const next = new Set(value);
        next.add(fish.id);
        writeStringArray("lks.fishing.caught", Array.from(next));
        return next;
      });
      playTone(760, 0.08, "triangle");
      queueFishingTimer(() => playTone(940, 0.08, "triangle"), 90);
    },
    [playTone, queueFishingTimer],
  );

  const triggerBite = useCallback(() => {
    if (phaseRef.current !== "waiting") {
      return;
    }

    const fish = pickFishingFish();

    targetFishRef.current = fish;
    phaseRef.current = "bite";
    setTargetFish(fish);
    setCaughtFish(null);
    setPhase("bite");
    setMessage(`${fish.name} 咬钩了！`);
    playTone(720, 0.08, "triangle");
    queueFishingTimer(() => {
      if (phaseRef.current === "bite") {
        finishEscape("提竿慢了一点，鱼溜走了。");
      }
    }, 2600);
  }, [finishEscape, playTone, queueFishingTimer]);

  const castLine = useCallback(() => {
    if (!["ready", "caught", "escaped"].includes(phaseRef.current)) {
      return;
    }

    clearFishingTimers();
    const nextBobber = {
      x: clampValue(38 + castPower * 0.42 + (Math.random() - 0.5) * 5, 44, 82),
      y: clampValue(72 - castPower * 0.26 + (Math.random() - 0.5) * 4, 44, 64),
    };

    setBobber(nextBobber);
    phaseRef.current = "casting";
    setPhase("casting");
    setTargetFish(null);
    setCaughtFish(null);
    setHoldingReel(false);
    setReelProgress(0);
    setTension(34);
    reelTapTimesRef.current = [];
    setMessage("鱼线飞出去了。");
    playTone(520, 0.06, "triangle");

    queueFishingTimer(() => {
      if (phaseRef.current !== "casting") {
        return;
      }

      phaseRef.current = "waiting";
      setPhase("waiting");
      setMessage("浮漂安静下来了，水下有鱼影靠近。");
      playTone(430, 0.06, "sine");
      queueFishingTimer(triggerBite, 1300 + Math.floor(Math.random() * 1800));
    }, 620);
  }, [castPower, clearFishingTimers, playTone, queueFishingTimer, triggerBite]);

  const startReeling = useCallback(() => {
    if (phaseRef.current !== "bite") {
      return;
    }

    clearFishingTimers();
    phaseRef.current = "reeling";
    tensionRef.current = 30;
    progressRef.current = 0;
    overTensionTicksRef.current = 0;
    reelTapTimesRef.current = [];
    setPhase("reeling");
    setHoldingReel(false);
    setTension(30);
    setReelProgress(0);
    setSweetSpot(26 + Math.floor(Math.random() * 24));
    setMessage("保持张力在亮色区域，把鱼慢慢拉回来。");
    playTone(580, 0.06, "square");
  }, [clearFishingTimers, playTone]);

  const registerReelTap = useCallback(() => {
    if (phaseRef.current !== "reeling") {
      return;
    }

    const now = window.performance.now();
    const recentTaps = [...reelTapTimesRef.current.filter((time) => now - time < 900), now];
    reelTapTimesRef.current = recentTaps;
    const tapCount = recentTaps.length;
    const progressGain = clampValue(2.4 + tapCount * 0.72, 3.1, 8.6);
    const tensionGain = clampValue(0.42 + tapCount * 0.18, 0.6, 2.35);
    const nextProgress = clampValue(progressRef.current + progressGain, 0, 100);
    const nextTension = clampValue(tensionRef.current + tensionGain, 0, 100);

    progressRef.current = nextProgress;
    tensionRef.current = nextTension;
    setReelProgress(nextProgress);
    setTension(nextTension);
    playTone(520 + Math.min(tapCount, 8) * 38, 0.035, "triangle");

    if (nextProgress >= 100 && targetFishRef.current) {
      finishCatch(targetFishRef.current);
    }
  }, [finishCatch, playTone]);

  useEffect(() => {
    if (phase !== "reeling") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (phaseRef.current !== "reeling") {
        return;
      }

      const now = window.performance.now();
      const recentTaps = reelTapTimesRef.current.filter((time) => now - time < 900);
      reelTapTimesRef.current = recentTaps;
      const tapCount = recentTaps.length;
      const tapPressure = Math.min(tapCount / 8, 1);
      const holding = holdingReelRef.current;
      const drift = Math.sin(Date.now() / 520) * 0.42 + (Math.random() - 0.5) * 0.28;
      const nextTension = clampValue(
        tensionRef.current + tapPressure * 0.92 + (holding ? 0.38 : -2.35) + drift,
        0,
        100,
      );
      const inSweetSpot =
        nextTension >= sweetSpot && nextTension <= sweetSpot + FISHING_SWEET_ZONE_WIDTH;
      const nextProgress = clampValue(
        progressRef.current +
          (tapCount > 0
            ? tapCount * (inSweetSpot ? 0.2 : 0.1)
            : holding
              ? 0.2
              : -0.38),
        0,
        100,
      );
      overTensionTicksRef.current =
        nextTension >= 96 ? overTensionTicksRef.current + 1 : Math.max(0, overTensionTicksRef.current - 3);

      tensionRef.current = nextTension;
      progressRef.current = nextProgress;
      setTension(nextTension);
      setReelProgress(nextProgress);

      if (nextTension >= 99.5 || overTensionTicksRef.current >= 20) {
        finishEscape("鱼线绷得太紧，断掉了。");
        return;
      }

      if (nextProgress >= 100 && targetFishRef.current) {
        finishCatch(targetFishRef.current);
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [finishCatch, finishEscape, phase, sweetSpot]);

  const pose =
    phase === "casting"
      ? ASSETS.fishingPoses.cast
      : phase === "bite"
        ? ASSETS.fishingPoses.bite
        : phase === "reeling"
          ? ASSETS.fishingPoses.reel
          : phase === "caught"
            ? ASSETS.fishingPoses.catch
            : ASSETS.fishingPoses.cast;
  const actionLabel =
    phase === "bite"
      ? "提竿"
      : phase === "reeling"
        ? "按住收线"
        : phase === "casting" || phase === "waiting"
          ? "等待"
          : "抛竿";
  const gestureLabel = phase === "reeling" ? "快速点击收线" : actionLabel;
  const actionDisabled = phase === "casting" || phase === "waiting";
  const collectionCount = caughtIds.size;
  const showLine = phase !== "ready" && phase !== "escaped";
  const reelRatio = phase === "reeling" ? reelProgress / 100 : phase === "caught" ? 1 : 0;
  const hookedLift = clampValue((reelRatio - 0.55) / 0.45, 0, 1);
  const hookedFishPosition = {
    x: clampValue(bobber.x + (45 - bobber.x) * reelRatio, 32, 84),
    y: clampValue(bobber.y + (56 - bobber.y) * reelRatio - hookedLift * 5, 46, 72),
  };
  const lineEnd = targetFish && phase === "reeling" ? hookedFishPosition : bobber;
  const lineStart =
    phase === "casting" || phase === "waiting" || phase === "bite"
      ? { x: 40.2, y: 20.8 }
      : { x: 47.5, y: 34 };
  const linePath = `M ${lineStart.x} ${lineStart.y} C ${Math.max(lineStart.x + 3, lineEnd.x - 12)} ${Math.max(30, lineEnd.y - 12)} ${lineEnd.x} ${lineEnd.y}`;
  const stageFish = FISHING_FISH.map((fish, index) => ({
    fish,
    lane: FISHING_SWIM_LANES[index % FISHING_SWIM_LANES.length],
  }));
  const runFishingGesture = () => {
    if (phaseRef.current === "bite") {
      startReeling();
      return;
    }

    if (["ready", "caught", "escaped"].includes(phaseRef.current)) {
      castLine();
    }
  };
  const beginFishingGesture = (event?: ReactPointerEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (phaseRef.current === "reeling") {
      registerReelTap();
      setHoldingReel(true);
      return;
    }

    runFishingGesture();
  };
  const endFishingGesture = (event?: ReactPointerEvent<HTMLElement>) => {
    event?.stopPropagation();
    setHoldingReel(false);
  };

  return (
    <section className="game-view fishing-view">
      <GameHeader
        title="看山钓鱼"
        image={ASSETS.fishingCover}
        onBack={onBack}
        controls={
          <>
            <button
              className="icon-button"
              type="button"
              onClick={resetFishing}
              aria-label="重新开始"
              title="重新开始"
            >
              <RotateCcw size={20} />
            </button>
            <button
              className="icon-button icon-button--active"
              type="button"
              onClick={() => (phase === "bite" ? startReeling() : castLine())}
              disabled={actionDisabled}
              aria-label={gestureLabel}
              title={gestureLabel}
            >
              {phase === "bite" ? <ArrowUp size={20} /> : <Fish size={20} />}
            </button>
          </>
        }
      />

      <div className="play-layout fishing-layout">
        <aside className="game-panel fishing-panel">
          <div className="fishing-preview" aria-hidden="true">
            <img src={pose} alt="" />
            {caughtFish && <img className="fishing-preview-fish" src={caughtFish.image} alt="" />}
          </div>

          <div className="stat-strip">
            <Stat icon={<Sparkles size={18} />} label="灵感币" value={coins} />
            <Stat icon={<Fish size={18} />} label="图鉴" value={`${collectionCount}/8`} />
            <Stat icon={<Trophy size={18} />} label="最高" value={best || "--"} />
            <Stat icon={<Timer size={18} />} label="阶段" value={gestureLabel} />
          </div>

          <label className="fishing-power">
            <span>抛竿力度</span>
            <input
              type="range"
              min="25"
              max="90"
              value={castPower}
              disabled={!["ready", "caught", "escaped"].includes(phase)}
              onChange={(event) => setCastPower(Number(event.target.value))}
            />
          </label>

          <div className="fishing-meter" aria-label="收线张力">
            <span
              className="fishing-meter-zone"
              style={
                {
                  "--zone-left": `${sweetSpot}%`,
                  "--zone-width": `${FISHING_SWEET_ZONE_WIDTH}%`,
                } as React.CSSProperties
              }
            />
            <span
              className="fishing-meter-fill"
              style={{ "--meter-value": `${tension}%` } as React.CSSProperties}
            />
          </div>

          <div className="fishing-progress" aria-label="收线进度">
            <span style={{ "--progress": `${reelProgress}%` } as React.CSSProperties} />
          </div>

          <button
            className="primary-action"
            type="button"
            disabled={actionDisabled}
            onClick={(event) => {
              event.stopPropagation();
              runFishingGesture();
            }}
            onPointerDown={beginFishingGesture}
            onPointerUp={endFishingGesture}
            onPointerCancel={endFishingGesture}
            onPointerLeave={endFishingGesture}
          >
            {gestureLabel}
          </button>
        </aside>

        <div className="board-shell fishing-shell">
          <div
            className={`fishing-stage fishing-stage--${phase} ${holdingReel ? "fishing-stage--holding" : ""}`}
            style={{ backgroundImage: `url(${ASSETS.fishingStage})` }}
            onClick={(event) => {
              event.stopPropagation();
              runFishingGesture();
            }}
            onPointerDown={beginFishingGesture}
            onPointerUp={endFishingGesture}
            onPointerCancel={endFishingGesture}
            onPointerLeave={endFishingGesture}
          >
            <span className="fishing-water-flow" aria-hidden="true" />
            <span className="fishing-water-glints" aria-hidden="true" />
            <svg className="fishing-current-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => (
                <path
                  key={index}
                  className="fishing-current-line"
                  style={{ "--current-delay": `${index * -0.38}s` } as React.CSSProperties}
                  d={`M ${4 + index * 7} ${33 + (index % 3) * 8} C ${24 + index * 4} ${27 + (index % 4) * 7}, ${56 + index * 2} ${48 + (index % 2) * 11}, ${98} ${43 + (index % 4) * 9}`}
                />
              ))}
            </svg>
            <div className="fishing-swim-layer" aria-hidden="true">
              {stageFish.map(({ fish, lane }, index) => (
                <img
                  key={`${fish.id}-${index}`}
                  className="fishing-water-fish"
                  src={fish.image}
                  alt=""
                  style={
                    {
                      "--fish-start-x": `${lane.startX}%`,
                      "--fish-start-y": `${lane.startY}%`,
                      "--fish-dx": `${lane.dx}%`,
                      "--fish-dy": `${lane.dy}%`,
                      "--fish-scale": lane.scale,
                      "--fish-end-scale": lane.endScale,
                      "--fish-flip": lane.dx < 0 ? -1 : 1,
                      "--fish-duration": `${lane.duration}s`,
                      "--fish-delay": `${lane.delay}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
            {showLine && (
              <svg className="fishing-line-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path className="fishing-line-shadow" d={linePath} />
                <path className="fishing-line-main" d={linePath} />
              </svg>
            )}
            {showLine && phase !== "reeling" && (
              <span
                className="fishing-bobber"
                style={
                  {
                    "--bobber-x": `${bobber.x}%`,
                    "--bobber-y": `${bobber.y}%`,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
            )}
            {phase === "bite" && (
              <span
                className="fishing-bite-ring"
                style={
                  {
                    "--bobber-x": `${bobber.x}%`,
                    "--bobber-y": `${bobber.y}%`,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
            )}
            {targetFish && phase === "reeling" && (
              <span
                className="fishing-hooked-fish"
                style={
                  {
                    "--hooked-x": `${hookedFishPosition.x}%`,
                    "--hooked-y": `${hookedFishPosition.y}%`,
                    "--hooked-lift": hookedLift,
                    "--hooked-rise": `${-hookedLift * 28}px`,
                    "--hooked-scale": 0.78 + reelRatio * 0.28,
                    "--hooked-tilt": `${-8 + reelRatio * 18}deg`,
                    "--hooked-splash-opacity": clampValue(0.72 - hookedLift * 0.62, 0.08, 0.72),
                    "--hooked-shadow-opacity": clampValue(0.34 - hookedLift * 0.18, 0.12, 0.34),
                  } as React.CSSProperties
                }
                aria-hidden="true"
              >
                <span className="fishing-hooked-splash" />
                <span className="fishing-hooked-shadow" />
                <img src={targetFish.image} alt="" />
              </span>
            )}
            {caughtFish && phase === "caught" && (
              <img className="fishing-catch-fish" src={caughtFish.image} alt="" />
            )}
            <button
              className="fishing-angler"
              type="button"
              aria-label={gestureLabel}
              title={gestureLabel}
              onClick={(event) => {
                event.stopPropagation();
                runFishingGesture();
              }}
              onPointerDown={beginFishingGesture}
              onPointerUp={endFishingGesture}
              onPointerCancel={endFishingGesture}
              onPointerLeave={endFishingGesture}
            >
              <span className="fishing-rod" aria-hidden="true" />
              <img className="fishing-kanshan" src={pose} alt="" draggable={false} />
            </button>
            <div className="fishing-message">
              <strong>{message}</strong>
              {targetFish && <span>{targetFish.rarityLabel} · {targetFish.trait}</span>}
            </div>
          </div>

          <div className="fishing-codex">
            {FISHING_FISH.map((fish) => {
              const unlocked = caughtIds.has(fish.id);

              return (
                <span
                  key={fish.id}
                  className={`fishing-codex-item ${unlocked ? "fishing-codex-item--open" : ""}`}
                  title={unlocked ? `${fish.name} · ${fish.price} 灵感币` : "未发现"}
                >
                  <img src={fish.image} alt="" />
                  <span>{unlocked ? fish.name : "???"}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function GameHeader({
  title,
  image,
  controls,
  onBack,
}: {
  title: string;
  image?: string;
  controls: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="game-header">
      <button className="back-button" type="button" onClick={onBack} title="返回大厅">
        <ChevronLeft size={18} />
        <span>大厅</span>
      </button>
      <div className="game-title">
        <span
          className={`game-title-image ${image ? "" : "game-title-image--mascot"}`}
          style={image ? { backgroundImage: `url(${image})` } : undefined}
        >
          {!image && <span className="mini-kanshan" />}
        </span>
        <h2>{title}</h2>
      </div>
      <div className="game-actions">{controls}</div>
    </div>
  );
}

function KanshanSnakePreview() {
  return (
    <div className="snake-preview" aria-hidden="true">
      <span className="preview-orb preview-orb-a" />
      <span className="preview-orb preview-orb-b" />
      <span className="preview-flower preview-flower-a" />
      <span className="preview-flower preview-flower-b" />
      <span className="preview-track">
        {Array.from({ length: 7 }, (_, index) => (
          <span
            key={index}
            className="preview-body-segment"
            style={{ "--segment": index } as React.CSSProperties}
          />
        ))}
        <span className="preview-tail" />
        <img className="preview-head" src={ASSETS.kanshanHead} alt="" draggable={false} />
      </span>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="stat-item">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
