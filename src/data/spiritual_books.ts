export interface SpiritualBook {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  pdfUrl: string;
  coverGradient: string;
  badge: string;
  description: string;
}

export const SPIRITUAL_BOOKS: SpiritualBook[] = [
  {
    id: "mans-eternal-quest",
    title: "Man's Eternal Quest",
    subtitle: "Collected Talks and Essays, Volume I",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/Paramahansa-Yogananda-MANS-ETERNAL-QUEST.pdf",
    coverGradient: "from-amber-600 via-amber-800 to-amber-950",
    badge: "Volume I",
    description: "Inspirational discourses and essays offering practical guidance on seeking God in everyday life and realizing the soul's divine potential."
  },
  {
    id: "divine-romance",
    title: "The Divine Romance",
    subtitle: "Collected Talks and Essays, Volume II",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/The-Divine-Romance-Collected-Talks-and-Essays-on-Realizing-God-in-daily-life-Vol2-PDFDrive.com-.pdf",
    coverGradient: "from-rose-600 via-purple-800 to-slate-950",
    badge: "Volume II",
    description: "Profound guidance on experiencing God's unconditional love, the art of devotion, and cultivating an intimate relationship with the Divine."
  },
  {
    id: "journey-to-self-realization",
    title: "Journey to Self-Realization",
    subtitle: "Collected Talks and Essays, Volume III",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/Journey-to-Self-Realization-Collected-Talks-and-Essays-on-Realizing-God-in-daily-life-Vol3-PDFDrive.com-.pdf",
    coverGradient: "from-indigo-600 via-indigo-900 to-slate-950",
    badge: "Volume III",
    description: "Deep spiritual insights explaining the science of Kriya Yoga, overcoming karma, and attaining ultimate soul-freedom."
  },
  {
    id: "solving-the-mystery-of-life",
    title: "Solving the Mystery of Life",
    subtitle: "Collected Talks and Essays, Volume IV",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2026/01/Solving-the-Mystery-of-Life_-Collected-Talks-Essays-on-Realizing-God-in-Daily-Life-Volume-IV.pdf",
    coverGradient: "from-emerald-600 via-teal-800 to-slate-950",
    badge: "Volume IV",
    description: "Illuminating talks on understanding the cosmic plan of creation, the guru-disciple relationship, and spiritual mastery."
  },
  {
    id: "moments-of-truth",
    title: "Moments of Truth",
    subtitle: "Daily Meditations and Inspirational Thoughts",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/Moments-of-Truth-Paramahansa-Yogananda-z-lib.org_.pdf",
    coverGradient: "from-amber-500 via-orange-700 to-amber-950",
    badge: "Daily Wisdom",
    description: "A cherished collection of uplifting daily thoughts, affirmative prayers, and soul-awakening truths for inner peace."
  },
  {
    id: "second-coming-of-christ",
    title: "The Second Coming of Christ",
    subtitle: "The Resurrection of the Christ Within You",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/The-Second-Coming-of-Christ-The-Resurrection-of-the-Christ-within-you-A-revelatory-commentary-on-the-original-teachings-of-Jesus.pdf",
    coverGradient: "from-cyan-600 via-blue-800 to-slate-950",
    badge: "Gospel Commentary",
    description: "A monumental revelatory commentary on the original teachings of Jesus, revealing the universal Christ Consciousness within all."
  },
  {
    id: "mejda",
    title: "Mejda",
    subtitle: "The Family Life of Paramahansa Yogananda",
    author: "Sananda Lal Ghosh",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/11/Mejda-by-Sananda-Lal-Gosh.pdf",
    coverGradient: "from-red-600 via-rose-800 to-slate-950",
    badge: "Biography",
    description: "An intimate biography by Yoganandaji's younger brother, chronicling his extraordinary early years, miracles, and youth in India."
  },
  {
    id: "god-talks-with-arjuna",
    title: "God Talks with Arjuna: The Bhagavad Gita",
    subtitle: "Royal Science of God-Realization",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/God-Talks-with-Arjuna_-The-Bhagavad-Gita-PDFDrive.com-.pdf",
    coverGradient: "from-yellow-600 via-amber-800 to-slate-950",
    badge: "Bhagavad Gita",
    description: "A masterwork commentary unfolding the allegorical, psychological, and spiritual depth of India's sacred scripture."
  },
  {
    id: "finding-the-joy-within-you",
    title: "Finding the Joy Within You",
    subtitle: "Personal Counsel for Joyful Living",
    author: "Sri Daya Mata",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/11/Finding-the-Joy-Within-You-Personal-Counsel-for-Sri-Daya-Mata.pdf",
    coverGradient: "from-violet-600 via-purple-800 to-slate-950",
    badge: "Sri Daya Mata",
    description: "Practical guidance and spiritual wisdom on discovering inner peace, living with devotion, and realizing God's presence within."
  },
  {
    id: "only-love",
    title: "Only Love",
    subtitle: "Living the Spiritual Life in a Changing World",
    author: "Sri Daya Mata",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/11/Only-love_Daya-Mata.pdf",
    coverGradient: "from-pink-600 via-rose-800 to-slate-950",
    badge: "Sri Daya Mata",
    description: "Inspiring talks on cultivating divine love, surrender, unwavering faith, and harmony in everyday life."
  },
  {
    id: "enter-the-quiet-heart",
    title: "Enter the Quiet Heart",
    subtitle: "Creating a Loving Relationship with God",
    author: "Sri Daya Mata",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/11/Enter-the-quiet-heart-Creating-a-Loving-Relationship-with-God_Daya-Mata.pdf",
    coverGradient: "from-teal-600 via-emerald-800 to-slate-950",
    badge: "Sri Daya Mata",
    description: "Uplifting reflections guiding spiritual seekers to quiet the mind, enter deep stillness, and feel God's loving communion."
  },
  {
    id: "god-alone",
    title: "God Alone",
    subtitle: "The Life and Letters of a Saint",
    author: "Sri Gyanamata",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/11/GOD-ALONE.pdf",
    coverGradient: "from-amber-600 via-orange-800 to-slate-950",
    badge: "Sri Gyanamata",
    description: "The inspiring life story and spiritual correspondence of Sister Gyanamata, one of Paramahansa Yogananda's most advanced disciples."
  },
  {
    id: "autobiography-of-a-yogi",
    title: "Autobiography of a Yogi",
    subtitle: "The Timeless Spiritual Classic",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/12/Autobiography-of-a-Yogi-2019.pdf",
    coverGradient: "from-amber-600 via-yellow-700 to-amber-950",
    badge: "Spiritual Classic",
    description: "The world-renowned spiritual classic chronicling Paramahansa Yogananda's remarkable life, encounters with enlightened masters, and the sacred science of Kriya Yoga."
  },
  {
    id: "christian-yoga-advanced-course",
    title: "Christian Yoga: Super Advanced Course",
    subtitle: "Lessons 1 to 12",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/Christian-YOGA-Super-Advanced-Course-Number-One-Lessons-1-to-12-by-Yogananda-z-lib.org_.pdf",
    coverGradient: "from-blue-600 via-indigo-800 to-slate-950",
    badge: "Advanced Course",
    description: "Esoteric lessons synthesizing the inner mystical teachings of Jesus Christ with the profound spiritual science of Raja Yoga and meditation."
  },
  {
    id: "cosmic-chants",
    title: "Cosmic Chants",
    subtitle: "Words and Music of Devotional Songs (1943)",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/Cosmic-Chants-second-edition-1943-signed.pdf",
    coverGradient: "from-purple-600 via-pink-700 to-slate-950",
    badge: "Devotional Songs",
    description: "Spiritualized chants and soulful prayers composed by Paramahansa Yogananda to awaken deep devotion, purify consciousness, and evoke divine bliss."
  },
  {
    id: "healing-by-gods-unlimited-power",
    title: "Healing by God's Unlimited Power",
    subtitle: "Spiritual and Scientific Principles of Healing",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/HEALING-BY-GODS-UNLIMITED-POWER.pdf",
    coverGradient: "from-emerald-600 via-teal-800 to-slate-950",
    badge: "Divine Healing",
    description: "Scientific and metaphysical methods for drawing on infinite cosmic life energy to heal physical ailments, mental disharmony, and spiritual blindness."
  },
  {
    id: "how-to-cultivate-divine-love",
    title: "How to Cultivate Divine Love",
    subtitle: "Awakening the Soul's Eternal Love for God",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/HOW-TO-CULTIVATE-DIVINE-LOVE.pdf",
    coverGradient: "from-rose-600 via-red-800 to-amber-950",
    badge: "Divine Love",
    description: "Profound wisdom on transforming conditional human affection into unconditional divine love and experiencing God as the Supreme Beloved."
  },
  {
    id: "metaphysical-meditations",
    title: "Metaphysical Meditations",
    subtitle: "Universal Prayers, Affirmations, and Visualizations",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/Metaphysical-Meditations_-Universal-Prayers-Affirmations-and-Visualizations-PDFDrive.com-.pdf",
    coverGradient: "from-cyan-600 via-teal-800 to-slate-950",
    badge: "Affirmations",
    description: "A sacred treasury of inspiring meditations, prayers, and affirmations to still the restless mind, conquer fear, and commune with God in silence."
  },
  {
    id: "the-master-said",
    title: "The Master Said",
    subtitle: "Sayings and Wise Counsel to Disciples",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/The-Master-Said-A-collection-of-Paramhansa-Yoganandas-sayings-and-wise-counsel-to-various-disciples-z-lib.org_.pdf",
    coverGradient: "from-orange-600 via-amber-800 to-slate-950",
    badge: "Wise Counsel",
    description: "Spontaneous sayings, penetrating insights, and loving counsel given by Paramahansa Yogananda to his disciples on the art of God-centered living."
  },
  {
    id: "undreamed-of-possibilities",
    title: "Undreamed-of Possibilities",
    subtitle: "Unlocking the Infinite Potential of the Soul",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/Undreamed-of-Possibilities-PDFDrive-.pdf",
    coverGradient: "from-indigo-600 via-violet-800 to-slate-950",
    badge: "Soul Mastery",
    description: "Uplifting discourses demonstrating how every individual can transcend mortal limitations, tap into cosmic energy, and realize soul greatness."
  },
  {
    id: "where-are-our-departed-loved-ones",
    title: "Where Are Our Departed Loved Ones?",
    subtitle: "The Mystery of Death and the Astral World",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/WHERE-ARE-OUR-DEPARTED-LOVED-ONES.pdf",
    coverGradient: "from-sky-600 via-blue-800 to-slate-950",
    badge: "Astral Mysteries",
    description: "Illuminating revelations about the afterlife, the astral spheres of light, reincarnation, and sending helpful thoughts of love to departed souls."
  },
  {
    id: "world-crisis",
    title: "World Crisis",
    subtitle: "Overcoming Fear and Finding Inner Security",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/WORLD-CRISIS.pdf",
    coverGradient: "from-fuchsia-600 via-purple-800 to-slate-950",
    badge: "Inner Security",
    description: "Timely spiritual counsel on navigating global turmoil with calm courage, moral fortitude, and unwavering faith in God's protective grace."
  },
  {
    id: "to-be-victorious-in-life",
    title: "To Be Victorious in Life",
    subtitle: "Dynamic Willpower and Spiritual Courage",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/To-be-victorious-in-life-Yogananda-Paramahansa-1893-1952-z-lib.org_.pdf",
    coverGradient: "from-yellow-600 via-amber-700 to-stone-950",
    badge: "Victory in Life",
    description: "Practical teachings on developing invincible willpower, mastering obstacles, maintaining enthusiasm, and achieving ultimate victory in life."
  },
  {
    id: "remolding-your-life",
    title: "Remolding Your Life",
    subtitle: "Self-Mastery and New Habit Patterns",
    author: "Paramahansa Yogananda",
    pdfUrl: "https://spiritualbooks.eu/wp-content/uploads/2024/10/REMOLDING-YOUR-LIFE.pdf",
    coverGradient: "from-teal-600 via-emerald-800 to-slate-950",
    badge: "Self-Mastery",
    description: "Dynamic spiritual techniques for conquering negative mental habits, cultivating good qualities, and recreating your personality in divine harmony."
  }
];
