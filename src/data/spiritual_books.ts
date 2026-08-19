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
  }
];
