import { desc } from "framer-motion/client";

export const MONSTER_ATTRIBUTES = [
  { ja: '火', en: 'Fire' },
  { ja: '雷', en: 'Thunder' },
  { ja: '水', en: 'Water' },
  { ja: '氷', en: 'Ice' },
  { ja: '光', en: 'Light' },
  { ja: '闇', en: 'Dark' },
  { ja: '風', en: 'Wind' },
  { ja: '聖', en: 'Holy' },
  { ja: '邪', en: 'Cursed' },
];


export const MONSTER_TYPES = [
  { ja: '人型', en: 'Humanoid' },
  { ja: '動物', en: 'Animal' },
  // { ja: '機械', en: 'Mechanical' },
];



export const MONSTER_STYLES = [
  { ja: 'アニメ風', en: 'Anime' },
  // { ja: 'リアル', en: 'Realistic' },
  { ja: 'リアル', en: 'Semi-realistic' }
];

export interface JobTypes {
  ja: string;
  en: string;
  desc: string;
  prompt: string;
}

export const JOBS: JobTypes[] = [
  { 
    ja: '戦士', 
    en: 'Warrior',
    desc: '戦士は、強力な武器と防具を使って戦うことに長けています。',
    prompt: 'A formidable warrior clad in heavy armor, firmly gripping a massive two-handed sword with both hands. The sword is held in a ready stance, blade gleaming. Muscular build, battle-scarred, with a determined expression. Poised for close combat, emanating an aura of strength and resilience.'
  },
  { 
    ja: 'パラディン', 
    en: 'Paladin', 
    desc: 'パラディンは、戦士の力と聖なる力を併せ持つ聖戦士です。',
    prompt: 'A holy paladin in brilliant, ornate armor adorned with religious symbols. Right hand tightly grasping the hilt of a sword glowing with holy energy, left arm bearing a shield emblazoned with a sacred emblem. The sword is raised in a defensive stance. Noble bearing, eyes shining with righteous determination.'
  },
  
  { 
    ja: '魔術師', 
    en: 'Mage', 
    desc: '魔術師は、魔法を使って戦うことに長けています。',
    prompt: 'An enigmatic mage in flowing, intricate robes decorated with arcane symbols. Both hands firmly holding a staff crackling with magical energy, using it as a focal point for spellcasting. Surrounded by floating spell components and glowing runes. Eyes gleaming with arcane knowledge, one hand positioned to direct a spell.'
  },
  { 
    ja: 'ネクロマンサー', 
    en: 'Necromancer', 
    desc: 'ネクロマンサーは、死者を操ることができる魔術師です。',
    prompt: 'A sinister necromancer in tattered, dark robes adorned with bone motifs. Pale skin, sunken eyes glowing with an eerie light. Surrounded by wisps of necromantic energy, commanding skeletal minions. Holding a staff topped with a skull, exuding an aura of death and decay.'
  },
  { 
    ja: 'アサシン', 
    en: 'Assassin', 
    desc: 'アサシンは、暗殺やステルスを得意とするスキルを持つ職業です。',
    prompt: 'A sleek assassin in form-fitting, dark leather armor with a hood. One hand gripping a razor-sharp dagger, the other poised to throw a small, deadly throwing knife. Multiple weapons visibly strapped to their body. Agile pose, ready to strike from the shadows. Sharp, calculating eyes and a face half-hidden in shadow.'
  },
  { 
    ja: '忍者', 
    en: 'Ninja', 
    desc: '忍者は、ステルスや変装、暗殺などのスキルを持つ職業です。',
    prompt: 'A stealthy ninja in traditional shinobi shozoku, face partially covered. One hand firmly grasping the hilt of a partially drawn katana, the other hand holding shuriken between the fingers, ready to throw. Smoke bombs visible on the belt. Lithe and agile, poised in a silent, ready stance. Eyes alert, scanning for threats and opportunities.'
  },
  { 
    ja: 'ビーストマスター', 
    en: 'Beastmaster', 
    desc: 'ビーストマスターは、動物やモンスターを操ることができる職業です。',
    prompt: 'A rugged beastmaster in leather and fur, adorned with tribal tattoos and animal tokens. Accompanied by a majestic animal companion (e.g., wolf, eagle). Carrying a staff or whip, emanating an aura of primal magic that connects them to nature and beasts.'
  },
  { 
    ja: 'ヒーラー', 
    en: 'Healer', 
    desc: 'ヒーラーは、味方のHPを回復することに長けています。',
    prompt: 'A serene healer in flowing, pristine robes with gentle, comforting features. Hands glowing with restorative magic, surrounded by soothing auras and nature-inspired magical effects. Carrying a staff or holy symbol, eyes filled with compassion and wisdom.'
  },
  { 
    ja: 'アーチャー', 
    en: 'Archer', 
    desc: 'アーチャーは、弓を使って遠距離から攻撃することに長けています。',
    prompt: "A skilled archer in lightweight, flexible armor allowing for quick movement. Hands in perfect position on a beautifully crafted longbow, arrow nocked and ready to fire. The bow is fully drawn, showcasing the archer's strength and precision. Quiver of various specialized arrows clearly visible on the back. Keen eyes focused on a distant target, standing in a perfect archer's stance."
  },
  {  
    ja: '賢者', 
    en: 'Sage', 
    desc: '賢者は深い知識と知恵を持ち、強力な魔法で仲間を導く魔法使い。',
    prompt: 'An elderly sage with a long beard, wearing ornate robes covered in mystical inscriptions. Surrounded by floating ancient tomes and magical artifacts. Eyes glowing with vast knowledge, gesturing to create complex magical diagrams in the air.'
  },
  { 
    ja: 'サイボーグ', 
    en: 'Cyborg', 
    desc: 'サイボーグは、機械と人間の融合体で、高度な技術を使って戦うことに長けています。',
    prompt: 'A sleek cyborg with a perfect blend of human and machine parts. Glowing cybernetic eyes, arms transforming into high-tech weapons. Partially exposed advanced circuitry, emanating an aura of technological power. Stance showcasing both human agility and mechanical precision.'
  },
  { 
    ja: 'ガンナー', 
    en: 'Gunner', 
    desc: 'ガンナーは、銃や火器を使って戦うことに長けています。',
    prompt: 'A sharp-eyed gunner in a mix of leather and metal armor. Both hands firmly gripping an advanced, customized gun with magical enhancements, finger on the trigger. The gun is raised and aimed, ready to fire. Various other firearms visibly holstered around their body. Stance ready for quick draws and precise shots, surrounded by floating magical bullets or gun parts.'
  },
  { 
    ja: 'サムライ', 
    en: 'Samurai', 
    desc: '侍は刀を手に誇り高く戦い、名誉と技で敵を打ち破る戦士だ。',
    prompt: 'A noble samurai in traditional armor (yoroi) with intricate designs. Hands firmly grasping the hilt of a masterfully crafted katana, either in a ready stance or mid-draw (iaido pose). The blade catching the light, showcasing its razor-sharp edge. Face showing a mix of serenity and fierce determination, embodying the way of bushido. Cherry blossoms or autumn leaves floating around for aesthetic.'
  },
  { 
    ja: 'ドラゴンナイト', 
    en: 'DragonKnight', 
    desc: 'ドラゴンナイトは、ドラゴンの力を使って戦うことに長けています。',
    prompt: "A majestic dragon knight in armor forged from dragon scales, with draconic motifs. One hand firmly grasping a lance crackling with dragon's breath energy, the other hand controlling reins or a shield. The weapon is held in an imposing, combat-ready position. Partial dragon-like features (e.g., eyes, small horns or scales). Accompanied by a spectral dragon or surrounded by swirling dragon energy."
  },
  { 
    ja: 'スペルソード', 
    en: 'Spellsword', 
    desc: 'スペルソードは、魔法と剣を併せ持つ戦士です。',
    prompt: 'A graceful spellsword in light, enchanted armor that flows like liquid metal. One hand firmly gripping a sword wreathed in magical energy, the blade held in a combat-ready stance. The other hand raised, palm out, conjuring a visible spell effect. Eyes and blade glowing with arcane power, stance combining the discipline of a warrior with the fluidity of a mage.'
  },
  // 他の職業は変更なし
]