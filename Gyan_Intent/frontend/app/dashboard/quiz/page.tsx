"use client";

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useUserStats } from "@/hooks/useUserStats";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Clock,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  BookOpen,
  Plus,
  Loader2,
} from "lucide-react";
import { useGoogleClassroom } from "@/hooks/useGoogleClassroom";
import GestureCamera from "@/components/quiz/GestureCamera";
import { Question, getQuestionsForTopic, pickRandom, generalQuestions } from "@/lib/questionBank";
import dynamic from "next/dynamic";

const QuizResults3D = dynamic(() => import("@/components/quiz/QuizResults3D"), { ssr: false });


const DEFAULT_TOPICS = [
  { id: "programming", name: "Programming", icon: "💻", color: "from-blue-500 to-cyan-500", desc: "Python, JavaScript, Data Structures" },
  { id: "advanced-maths", name: "Advanced Maths", icon: "📐", color: "from-purple-500 to-pink-500", desc: "Calculus, Linear Algebra, Statistics" },
  { id: "science", name: "Science", icon: "🔬", color: "from-green-500 to-emerald-500", desc: "Physics, Chemistry, Biology" },
];

export default function QuizPage() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "result">("menu");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showHint, setShowHint] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>(pickRandom(generalQuestions, 5));
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [showQuizCreator, setShowQuizCreator] = useState(false);

  const { isConnected, connect, fetchCourses } = useGoogleClassroom();

  useEffect(() => {
    if (isConnected) loadClassroomSubjects();
  }, [isConnected]);

  const loadClassroomSubjects = async () => {
    const courses = await fetchCourses();
    setSubjects([...new Set(courses.map((c: any) => c.name))]);
  };

  const generateQuizForSubject = async (subject: string) => {
    setGeneratingQuiz(true);
    setSelectedSubject(subject);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${API_BASE}/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, count: questionCount }),
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: Question[] = data.questions.map((q: any) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          hint: q.hint,
          topic: subject,
        }));
        setQuestions(mapped.length > 0 ? mapped : getQuestionsForTopic(subject, questionCount));
      } else {
        // Fallback to static bank
        setQuestions(getQuestionsForTopic(subject, questionCount));
      }
    } catch {
      setQuestions(getQuestionsForTopic(subject, questionCount));
    }
    setGameState("playing");
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setTimeLeft(30);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowHint(false);
    setGeneratingQuiz(false);
  };

  useEffect(() => {
    if (gameState !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { handleNextQuestion(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, currentQuestion]);

  const pointsAwardedRef = useRef(false);
  const { addPoints, recordQuiz } = useUserStats();

  // Award points when quiz completes
  useEffect(() => {
    if (gameState === "result" && !pointsAwardedRef.current && score > 0) {
      pointsAwardedRef.current = true;
      addPoints(score);
      recordQuiz();
    }
    if (gameState === "menu" || gameState === "playing") {
      pointsAwardedRef.current = false;
    }
  }, [gameState, score, addPoints, recordQuiz]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion >= questions.length - 1) {
      setGameState("result");
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowHint(false);
      setTimeLeft(30);
    }
  }, [currentQuestion, questions]);

  const handleAnswer = useCallback((answerIndex: number) => {
    if (selectedAnswer !== null || !questions[currentQuestion]) return;
    const correct = answerIndex === questions[currentQuestion].correct_answer;
    setSelectedAnswer(answerIndex);
    setIsCorrect(correct);
    setAnswers((prev) => [...prev, correct]);
    if (correct) setScore((prev) => prev + 10);
    // Auto-advance after 1.5s
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  }, [currentQuestion, selectedAnswer, questions, handleNextQuestion]);

  const startQuiz = () => {
    setQuestions(pickRandom(generalQuestions, questionCount));
    setSelectedSubject(null);
    setGameState("playing");
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setTimeLeft(30);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowHint(false);
  };

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-white/60 hover:text-white">← Back</a>
            <h1 className="text-xl font-bold gradient-text">Gesture Quiz</h1>
          </div>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                <CheckCircle size={14} />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <button onClick={async () => { try { await connect(); } catch(e) { console.error(e); } }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition">
                <BookOpen size={16} />
                Sign in with Google Classroom
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {gameState === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="py-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Welcome to Gesture Quiz!</h2>
                <p className="text-white/60">Test your knowledge with True/False questions</p>
              </div>

              {/* Default Topics - EDU Mode */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-xl">📚</span>
                    Default Topics
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">EDU</span>
                  </h3>
                  <button onClick={() => setShowQuizCreator(!showQuizCreator)} className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1">
                    <Plus size={14} />
                    {showQuizCreator ? "Hide" : "Create Quiz"}
                  </button>
                </div>

                {showQuizCreator && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-white/60 whitespace-nowrap">Questions:</label>
                      <input type="range" min="5" max="20" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value))} className="flex-1 accent-purple-500" />
                      <span className="text-lg font-bold text-purple-400 w-8">{questionCount}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-2">Click a topic below to generate {questionCount} questions</p>
                  </motion.div>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  {DEFAULT_TOPICS.map((topic) => (
                    <button key={topic.id} onClick={() => generateQuizForSubject(topic.name)} disabled={generatingQuiz} className={`relative overflow-hidden p-5 rounded-xl text-left hover:scale-105 transition-all duration-300 bg-gradient-to-br ${topic.color} disabled:opacity-70 disabled:hover:scale-100`}>
                      {generatingQuiz && selectedSubject === topic.name && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl z-10">
                          <Loader2 size={28} className="text-white animate-spin" />
                        </div>
                      )}
                      <div className="text-4xl mb-3">{topic.icon}</div>
                      <p className="font-bold text-white text-lg">{topic.name}</p>
                      <p className="text-xs text-white/70 mt-1">{topic.desc}</p>
                      <div className="mt-3 text-xs text-white/60">Max 20 questions</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Classroom Subjects */}
              {isConnected && subjects.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="text-xl">🎓</span>
                    Your Classroom Topics
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Connected</span>
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {subjects.map((subject) => (
                      <button key={subject} onClick={() => generateQuizForSubject(subject)} disabled={generatingQuiz} className="glass-panel p-4 rounded-xl text-left hover:border-purple-500/50 transition disabled:opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            {generatingQuiz && selectedSubject === subject ? (
                              <Loader2 size={20} className="text-purple-400 animate-spin" />
                            ) : (
                              <BookOpen size={20} className="text-purple-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{subject}</p>
                            <p className="text-xs text-white/40">
                              {generatingQuiz && selectedSubject === subject ? "Generating questions…" : "Click to start quiz"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center">
                <p className="text-white/40 text-sm mb-4">or start with general knowledge</p>
                <button onClick={startQuiz} disabled={generatingQuiz} className="w-full max-w-md mx-auto py-4 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition flex items-center justify-center gap-2">
                  <Sparkles size={20} />
                  Start General Quiz
                </button>
              </div>
            </motion.div>
          )}

          {gameState === "playing" && question && (
            <motion.div key={`question-${currentQuestion}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Question {currentQuestion + 1}/{questions.length}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {timeLeft}s</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" initial={{ width: 0 }} animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
                </div>
              </div>

              <div className="glass-panel p-8 rounded-2xl mb-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold flex-1">{question.question}</h2>
                  <GestureCamera 
                    onGestureDetected={(gesture) => {
                      if (gesture === "thumbs_up") handleAnswer(0);
                      if (gesture === "thumbs_down") handleAnswer(1);
                    }} 
                    disabled={selectedAnswer !== null}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleAnswer(0)} disabled={selectedAnswer !== null} className={`p-6 rounded-xl border-2 transition flex flex-col items-center gap-3 ${selectedAnswer === 0 ? isCorrect ? "border-green-500 bg-green-500/20" : "border-red-500 bg-red-500/20" : selectedAnswer !== null && question.correct_answer === 0 ? "border-green-500 bg-green-500/10" : "border-white/20 hover:border-green-500/50 hover:bg-green-500/10"} disabled:cursor-not-allowed`}>
                    <ThumbsUp size={40} className={selectedAnswer === 0 ? isCorrect ? "text-green-400" : "text-red-400" : "text-white/60"} />
                    <span className="font-semibold">TRUE</span>
                  </button>
                  <button onClick={() => handleAnswer(1)} disabled={selectedAnswer !== null} className={`p-6 rounded-xl border-2 transition flex flex-col items-center gap-3 ${selectedAnswer === 1 ? isCorrect ? "border-green-500 bg-green-500/20" : "border-red-500 bg-red-500/20" : selectedAnswer !== null && question.correct_answer === 1 ? "border-green-500 bg-green-500/10" : "border-white/20 hover:border-red-500/50 hover:bg-red-500/10"} disabled:cursor-not-allowed`}>
                    <ThumbsDown size={40} className={selectedAnswer === 1 ? isCorrect ? "text-green-400" : "text-red-400" : "text-white/60"} />
                    <span className="font-semibold">FALSE</span>
                  </button>
                </div>
                {showHint && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"><p className="text-amber-400 text-sm">💡 Hint: {question.hint}</p></motion.div>}
                {!showHint && selectedAnswer === null && <button onClick={() => setShowHint(true)} className="mt-4 text-white/40 hover:text-white/60 text-sm underline">Need a hint?</button>}
              </div>

              {selectedAnswer !== null && (
                <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={handleNextQuestion} className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 transition flex items-center justify-center gap-2">
                  {currentQuestion >= questions.length - 1 ? <><Trophy size={20} /> See Results</> : <><ArrowRight size={20} /> Next Question</>}
                </motion.button>
              )}
            </motion.div>
          )}

          {gameState === "result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center py-8">
              <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
              <p className="text-white/60 mb-6">You scored <span className="text-purple-400 font-bold">{score}</span> points</p>

              <QuizResults3D
                correct={answers.filter(Boolean).length}
                incorrect={answers.filter((a) => !a).length}
                score={score}
                total={answers.length}
              />

              <div className="grid grid-cols-3 gap-4 mt-6 mb-6 max-w-md mx-auto">
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-2xl font-bold text-green-400">{answers.filter(Boolean).length}</p>
                  <p className="text-xs text-white/40">Correct</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-2xl font-bold text-purple-400">{Math.round((answers.filter(Boolean).length / answers.length) * 100)}%</p>
                  <p className="text-xs text-white/40">Accuracy</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-2xl font-bold text-red-400">{answers.filter((a) => !a).length}</p>
                  <p className="text-xs text-white/40">Incorrect</p>
                </div>
              </div>

              <div className="flex gap-4 max-w-md mx-auto">
                <button onClick={() => setGameState("menu")} className="flex-1 py-4 rounded-xl font-semibold border border-white/20 hover:bg-white/5 transition flex items-center justify-center gap-2"><RotateCcw size={20} /> Try Again</button>
                <a href="/dashboard" className="flex-1 py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 transition flex items-center justify-center gap-2">Dashboard</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}