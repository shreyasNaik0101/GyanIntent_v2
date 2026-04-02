export interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  hint: string;
}

// ─── Programming ────────────────────────────────────────────────────────────
export const programmingQuestions: Question[] = [
  { id: "p1", question: "Python uses indentation to define code blocks.", options: ["True", "False"], correct_answer: 0, hint: "Unlike C++ or Java, Python uses whitespace indentation instead of curly braces." },
  { id: "p2", question: "JavaScript and Java are the same programming language.", options: ["True", "False"], correct_answer: 1, hint: "Despite similar names, they are completely different languages with different use cases." },
  { id: "p3", question: "HTML is a programming language.", options: ["True", "False"], correct_answer: 1, hint: "HTML is a markup language used to structure content on the web, not a programming language." },
  { id: "p4", question: "A stack data structure follows Last-In-First-Out (LIFO) order.", options: ["True", "False"], correct_answer: 0, hint: "The last element pushed onto the stack is the first one to be popped off." },
  { id: "p5", question: "Array indices start at 1 in most programming languages.", options: ["True", "False"], correct_answer: 1, hint: "Most languages (C, Java, Python, JS) use 0-based indexing." },
  { id: "p6", question: "CSS is used to style and layout web pages.", options: ["True", "False"], correct_answer: 0, hint: "CSS (Cascading Style Sheets) controls the presentation of HTML elements." },
  { id: "p7", question: "A binary search tree node can have at most two children.", options: ["True", "False"], correct_answer: 0, hint: "Each node in a BST has at most a left child and a right child." },
  { id: "p8", question: "Python is a statically typed language.", options: ["True", "False"], correct_answer: 1, hint: "Python is dynamically typed — variable types are determined at runtime." },
  { id: "p9", question: "Git is a version control system.", options: ["True", "False"], correct_answer: 0, hint: "Git tracks changes in source code during software development." },
  { id: "p10", question: "The time complexity of binary search is O(n).", options: ["True", "False"], correct_answer: 1, hint: "Binary search has O(log n) time complexity because it halves the search space each step." },
  { id: "p11", question: "SQL stands for Structured Query Language.", options: ["True", "False"], correct_answer: 0, hint: "SQL is the standard language for managing relational databases." },
  { id: "p12", question: "In Python, lists are immutable.", options: ["True", "False"], correct_answer: 1, hint: "Lists are mutable — you can add, remove, and modify elements. Tuples are immutable." },
  { id: "p13", question: "Recursion is when a function calls itself.", options: ["True", "False"], correct_answer: 0, hint: "A recursive function solves a problem by reducing it to smaller instances of the same problem." },
  { id: "p14", question: "HTTP status code 404 means the server has crashed.", options: ["True", "False"], correct_answer: 1, hint: "404 means 'Not Found' — the requested resource doesn't exist. A crash is typically 500." },
  { id: "p15", question: "An API stands for Application Programming Interface.", options: ["True", "False"], correct_answer: 0, hint: "APIs define how different software components communicate with each other." },
  { id: "p16", question: "The 'else if' statement in Python is written as 'elif'.", options: ["True", "False"], correct_answer: 0, hint: "Python uses 'elif' as shorthand for 'else if'." },
  { id: "p17", question: "A linked list provides O(1) random access to elements.", options: ["True", "False"], correct_answer: 1, hint: "Linked lists require O(n) traversal. Arrays provide O(1) random access." },
  { id: "p18", question: "TypeScript is a superset of JavaScript.", options: ["True", "False"], correct_answer: 0, hint: "TypeScript adds static typing on top of JavaScript and compiles to plain JS." },
  { id: "p19", question: "In object-oriented programming, inheritance allows a class to use methods of another class.", options: ["True", "False"], correct_answer: 0, hint: "Inheritance lets a child class reuse and extend the functionality of a parent class." },
  { id: "p20", question: "The Big-O notation O(1) means the algorithm's time grows linearly.", options: ["True", "False"], correct_answer: 1, hint: "O(1) means constant time — it does not change regardless of input size. O(n) is linear." },
];

// ─── Advanced Maths ─────────────────────────────────────────────────────────
export const mathQuestions: Question[] = [
  { id: "m1", question: "The derivative of sin(x) is cos(x).", options: ["True", "False"], correct_answer: 0, hint: "This is a fundamental differentiation rule in calculus." },
  { id: "m2", question: "The square root of a negative number is a real number.", options: ["True", "False"], correct_answer: 1, hint: "Square roots of negative numbers are imaginary (e.g., √(−1) = i)." },
  { id: "m3", question: "The integral of 1/x dx is ln|x| + C.", options: ["True", "False"], correct_answer: 0, hint: "This is a standard integration result in calculus." },
  { id: "m4", question: "Every 3×3 matrix has an inverse.", options: ["True", "False"], correct_answer: 1, hint: "A matrix has an inverse only if its determinant is non-zero (non-singular)." },
  { id: "m5", question: "Pi (π) is a rational number.", options: ["True", "False"], correct_answer: 1, hint: "π is irrational — it cannot be expressed as a ratio of two integers." },
  { id: "m6", question: "The sum of interior angles in a triangle is always 180°.", options: ["True", "False"], correct_answer: 0, hint: "This holds for all triangles in Euclidean (flat) geometry." },
  { id: "m7", question: "The limit of sin(x)/x as x → 0 is 1.", options: ["True", "False"], correct_answer: 0, hint: "This fundamental limit is used throughout calculus and Taylor series." },
  { id: "m8", question: "A vector space must contain a zero vector.", options: ["True", "False"], correct_answer: 0, hint: "The zero vector is required by the vector space axioms." },
  { id: "m9", question: "The Fibonacci sequence starts with 0 and 1.", options: ["True", "False"], correct_answer: 0, hint: "The sequence is: 0, 1, 1, 2, 3, 5, 8, 13, 21, …" },
  { id: "m10", question: "The determinant of a 2×2 identity matrix is 0.", options: ["True", "False"], correct_answer: 1, hint: "The determinant of any identity matrix is 1." },
  { id: "m11", question: "Euler's identity states e^(iπ) + 1 = 0.", options: ["True", "False"], correct_answer: 0, hint: "It beautifully connects five fundamental constants: e, i, π, 1, and 0." },
  { id: "m12", question: "Standard deviation can be a negative value.", options: ["True", "False"], correct_answer: 1, hint: "Standard deviation is the square root of variance, so it is always ≥ 0." },
  { id: "m13", question: "A prime number has exactly two distinct positive factors.", options: ["True", "False"], correct_answer: 0, hint: "A prime is divisible only by 1 and itself." },
  { id: "m14", question: "The dot product of two perpendicular vectors is 1.", options: ["True", "False"], correct_answer: 1, hint: "Perpendicular (orthogonal) vectors have a dot product of 0, not 1." },
  { id: "m15", question: "log₂(8) equals 3.", options: ["True", "False"], correct_answer: 0, hint: "Since 2³ = 8, the logarithm base 2 of 8 is indeed 3." },
  { id: "m16", question: "The derivative of e^x is e^x.", options: ["True", "False"], correct_answer: 0, hint: "e^x is unique because it is its own derivative." },
  { id: "m17", question: "The set of natural numbers includes negative integers.", options: ["True", "False"], correct_answer: 1, hint: "Natural numbers are positive integers: 1, 2, 3, … (some definitions include 0)." },
  { id: "m18", question: "A function is continuous if you can draw it without lifting your pen.", options: ["True", "False"], correct_answer: 0, hint: "This is the intuitive definition — formally, the limit equals the function value at every point." },
  { id: "m19", question: "The area under a curve can be computed using integration.", options: ["True", "False"], correct_answer: 0, hint: "Definite integration gives the signed area between a curve and the x-axis." },
  { id: "m20", question: "Two matrices can always be multiplied regardless of their dimensions.", options: ["True", "False"], correct_answer: 1, hint: "Matrix A (m×n) can only multiply B (p×q) if n = p (columns of A = rows of B)." },
];

// ─── Science ────────────────────────────────────────────────────────────────
export const scienceQuestions: Question[] = [
  { id: "s1", question: "Water molecules consist of two hydrogen atoms and one oxygen atom.", options: ["True", "False"], correct_answer: 0, hint: "H₂O — two hydrogen atoms bonded to one oxygen atom." },
  { id: "s2", question: "Light travels faster than sound.", options: ["True", "False"], correct_answer: 0, hint: "Light: ~3×10⁸ m/s vs Sound: ~343 m/s in air." },
  { id: "s3", question: "Electrons are heavier than protons.", options: ["True", "False"], correct_answer: 1, hint: "Protons are about 1,836 times more massive than electrons." },
  { id: "s4", question: "DNA stands for Deoxyribonucleic Acid.", options: ["True", "False"], correct_answer: 0, hint: "DNA carries the genetic instructions for all known living organisms." },
  { id: "s5", question: "The Earth's core is made primarily of iron and nickel.", options: ["True", "False"], correct_answer: 0, hint: "Both the inner and outer core are composed mainly of iron-nickel alloy." },
  { id: "s6", question: "Plants release oxygen during photosynthesis.", options: ["True", "False"], correct_answer: 0, hint: "Photosynthesis converts CO₂ and water into glucose and O₂ using sunlight." },
  { id: "s7", question: "Sound can travel through a vacuum.", options: ["True", "False"], correct_answer: 1, hint: "Sound needs a medium (solid, liquid, or gas) to propagate — that's why space is silent." },
  { id: "s8", question: "Mitochondria are known as the powerhouse of the cell.", options: ["True", "False"], correct_answer: 0, hint: "Mitochondria generate most of the cell's supply of ATP (energy currency)." },
  { id: "s9", question: "Diamonds and graphite are both made entirely of carbon.", options: ["True", "False"], correct_answer: 0, hint: "They are allotropes of carbon with very different crystal structures." },
  { id: "s10", question: "Absolute zero is 0°C.", options: ["True", "False"], correct_answer: 1, hint: "Absolute zero is −273.15°C (0 Kelvin), the lowest possible temperature." },
  { id: "s11", question: "The pH of pure water at 25°C is 7.", options: ["True", "False"], correct_answer: 0, hint: "pH 7 is neutral — neither acidic nor basic." },
  { id: "s12", question: "Venus is the closest planet to the Sun.", options: ["True", "False"], correct_answer: 1, hint: "Mercury is closest to the Sun. Venus is the second planet from the Sun." },
  { id: "s13", question: "Antibiotics are effective against viral infections.", options: ["True", "False"], correct_answer: 1, hint: "Antibiotics only work against bacteria, not viruses." },
  { id: "s14", question: "Newton's third law: every action has an equal and opposite reaction.", options: ["True", "False"], correct_answer: 0, hint: "This is one of the three fundamental laws of classical mechanics." },
  { id: "s15", question: "The speed of light in a vacuum is approximately 3 × 10⁸ m/s.", options: ["True", "False"], correct_answer: 0, hint: "This is one of the most fundamental constants in physics." },
  { id: "s16", question: "Humans have 46 chromosomes in each body cell.", options: ["True", "False"], correct_answer: 0, hint: "23 pairs of chromosomes — 22 autosomal pairs and 1 pair of sex chromosomes." },
  { id: "s17", question: "The chemical symbol for gold is Go.", options: ["True", "False"], correct_answer: 1, hint: "Gold's symbol is Au, from the Latin word 'Aurum'." },
  { id: "s18", question: "Gravity on the Moon is about 1/6th of Earth's gravity.", options: ["True", "False"], correct_answer: 0, hint: "The Moon's weaker gravity means you'd weigh about 1/6 of your Earth weight." },
  { id: "s19", question: "Red blood cells carry oxygen using a protein called hemoglobin.", options: ["True", "False"], correct_answer: 0, hint: "Hemoglobin binds oxygen in the lungs and releases it in tissues." },
  { id: "s20", question: "Acids have a pH greater than 7.", options: ["True", "False"], correct_answer: 1, hint: "Acids have pH < 7, bases have pH > 7, and neutral is 7." },
];

// ─── General Knowledge (fallback) ───────────────────────────────────────────
export const generalQuestions: Question[] = [
  { id: "g1", question: "The Great Wall of China is visible from space with the naked eye.", options: ["True", "False"], correct_answer: 1, hint: "This is a common myth — it's too narrow to be seen from orbit without aid." },
  { id: "g2", question: "An octopus has three hearts.", options: ["True", "False"], correct_answer: 0, hint: "Two pump blood to the gills; one pumps it to the rest of the body." },
  { id: "g3", question: "Lightning never strikes the same place twice.", options: ["True", "False"], correct_answer: 1, hint: "Tall structures like the Empire State Building are struck dozens of times a year." },
  { id: "g4", question: "Bananas are technically berries.", options: ["True", "False"], correct_answer: 0, hint: "Botanically, bananas qualify as berries, while strawberries do not!" },
  { id: "g5", question: "Mount Everest is the tallest mountain measured from base to peak.", options: ["True", "False"], correct_answer: 1, hint: "Mauna Kea in Hawaii is taller base-to-peak, but Everest has the highest summit above sea level." },
  { id: "g6", question: "Honey never spoils if stored properly.", options: ["True", "False"], correct_answer: 0, hint: "Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible." },
  { id: "g7", question: "A group of flamingos is called a 'flamboyance'.", options: ["True", "False"], correct_answer: 0, hint: "Fitting name for such colorful birds!" },
  { id: "g8", question: "The Amazon River is the longest river in the world.", options: ["True", "False"], correct_answer: 1, hint: "The Nile is generally considered the longest. The Amazon is the largest by water volume." },
  { id: "g9", question: "Sharks are older than trees in evolutionary history.", options: ["True", "False"], correct_answer: 0, hint: "Sharks appeared ~450 million years ago; trees around ~350 million years ago." },
  { id: "g10", question: "Venus is the hottest planet in our solar system.", options: ["True", "False"], correct_answer: 0, hint: "Despite not being closest to the Sun, Venus's thick CO₂ atmosphere traps heat." },
  { id: "g11", question: "Goldfish have a memory span of only 3 seconds.", options: ["True", "False"], correct_answer: 1, hint: "Studies show goldfish can remember things for months." },
  { id: "g12", question: "A day on Venus is longer than a year on Venus.", options: ["True", "False"], correct_answer: 0, hint: "Venus rotates so slowly that one full rotation takes longer than its orbit around the Sun." },
  { id: "g13", question: "The human body contains more bacterial cells than human cells.", options: ["True", "False"], correct_answer: 0, hint: "The ratio is roughly 1.3 bacterial cells for every human cell." },
  { id: "g14", question: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.", options: ["True", "False"], correct_answer: 0, hint: "The Great Pyramid was built ~2560 BC; Cleopatra lived ~30 BC; Moon landing was 1969 AD." },
  { id: "g15", question: "Ostriches bury their heads in the sand when scared.", options: ["True", "False"], correct_answer: 1, hint: "They actually lie flat on the ground, making their head and neck blend with the terrain." },
];

/** Pick `count` random questions from an array (Fisher-Yates shuffle). */
export function pickRandom(bank: Question[], count: number): Question[] {
  const shuffled = [...bank];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Get the question bank for a given topic name. */
export function getQuestionsForTopic(topicName: string, count: number): Question[] {
  const key = topicName.toLowerCase();
  if (key.includes("program") || key.includes("code") || key.includes("comput")) {
    return pickRandom(programmingQuestions, count);
  }
  if (key.includes("math") || key.includes("calcul") || key.includes("algebra") || key.includes("statistic")) {
    return pickRandom(mathQuestions, count);
  }
  if (key.includes("science") || key.includes("physic") || key.includes("chem") || key.includes("bio")) {
    return pickRandom(scienceQuestions, count);
  }
  return pickRandom(generalQuestions, count);
}
