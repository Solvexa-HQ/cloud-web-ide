import { useState, useRef, useEffect, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorSelection, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { Play, Terminal, ChevronDown, ChevronUp, Loader2, Code2, Keyboard, Save, FolderOpen, LogOut, LogIn } from 'lucide-react';
import { supabase } from './supabaseClient';

// 환경 변수(.env)에서 AWS EC2 코드 실행 백엔드 서버 주소 로드
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 언어별 기본 템플릿 코드
const DEFAULT_CODE = {
  python: `# Cloud Web IDE (Python 3.11)\nfor i in range(1, 4):\n    print(f"Hello Universal IDE #{i}")\n`,
  javascript: `// Cloud Web IDE (Node.js 20)\nconst envs = ['Mobile', 'Tablet', 'Desktop PC'];\nenvs.forEach(env => console.log(\`Optimized for \${env}\`));\n`,
  cpp: `// Cloud Web IDE (C++ GCC)\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Cross-Platform Cloud IDE Running!" << endl;\n    return 0;\n}\n`
};

// 모바일/태블릿 환경을 위한 빠른 특수문자 입력 및 커서 이동 버튼 설정
const QUICK_SYMBOLS = [
  { label: 'Tab', value: '    ', type: 'insert' },
  { label: '{', value: '{}', offset: -1, type: 'insert' },
  { label: '}', value: '}', type: 'insert' },
  { label: '(', value: '()', offset: -1, type: 'insert' },
  { label: ')', value: ')', type: 'insert' },
  { label: '[', value: '[]', offset: -1, type: 'insert' },
  { label: ';', value: ';', type: 'insert' },
  { label: '=', value: ' = ', type: 'insert' },
  { label: '"', value: '""', offset: -1, type: 'insert' },
  { label: "'", value: "''", offset: -1, type: 'insert' },
  { label: ':', value: ':', type: 'insert' },
  { label: '←', value: -1, type: 'move' },
  { label: '→', value: 1, type: 'move' },
];

export default function App() {
  // 에디터 및 실행 상태 관리
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [output, setOutput] = useState('실행 버튼(또는 Ctrl+Enter)을 눌러 코드를 테스트하세요.');
  const [isRunning, setIsRunning] = useState(false);

  // UI 레이아웃 및 모바일 가상 키보드 상태 관리
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showSymbolBar, setShowSymbolBar] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // 사용자 인증 및 클라우드 코드 스니펫 상태 관리
  const [user, setUser] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [title, setTitle] = useState('main_script');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // CodeMirror 에디터 인스턴스 참조
  const editorViewRef = useRef(null);

  // Supabase DB에서 로그인한 사용자의 저장된 코드 목록 조회
  const fetchSnippets = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('snippets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (!error && data) setSnippets(data);
  }, []);

  // 초기 세션 확인 및 인증 상태 변경 구독
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchSnippets(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchSnippets(session.user.id);
      else setSnippets([]);
    });

    return () => subscription.unsubscribe();
  }, [fetchSnippets]);

  // GitHub OAuth 로그인 처리
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 작성 중인 코드를 Supabase 클라우드에 저장
  const handleSaveToCloud = async () => {
    if (!user) {
      alert('로그인이 필요합니다!');
      handleLogin();
      return;
    }

    const { error } = await supabase.from('snippets').insert({
      user_id: user.id,
      title: title,
      language: language,
      code: code,
      updated_at: new Date()
    });

    if (error) {
      alert(`저장 실패: ${error.message}`);
    } else {
      alert('클라우드에 코드가 성공적으로 저장되었습니다!');
      fetchSnippets(user.id);
    }
  };

  // AWS EC2 컨테이너 샌드박스 서버로 코드 실행 요청 전송
  const handleExecute = useCallback(async () => {
    // 비로그인 상태에서는 코드 실행 차단
    if (!user) {
      setIsConsoleOpen(true);
      setOutput('코드를 실행하려면 먼저 로그인해주세요.');
      return;
    }
    if (isRunning) return;

    setIsRunning(true);
    setIsConsoleOpen(true);
    setOutput('컨테이너 샌드박스에서 실행 중...');

    // EC2 서버가 꺼져 있을 때 무한 대기를 방지하기 위한 7초 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
        signal: controller.signal,
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (res.status >= 502 && res.status <= 504) {
          setOutput('서버가 비활성화되었거나 인터넷 연결이 불안정합니다. (EC2 서버가 꺼져 있을 수 있습니다)');
        } else {
          setOutput(`Error: ${data.detail || '서버 오류 발생'}`);
        }
      } else {
        setOutput(data.output || '(출력값 없음)');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setOutput('요청 시간이 초과되었습니다. 서버가 비활성화되었거나 인터넷 연결이 불안정합니다.');
      } else {
        setOutput('서버가 비활성화되었거나 인터넷 연결이 불안정합니다.\n(EC2 서버가 꺼져 있는지 확인하세요)');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsRunning(false);
    }
  }, [user, isRunning, language, code]);

  // 모바일 가상 키보드 올라올 때 화면 높이 및 콘솔창 자동 조절
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      setViewportHeight(vv.height);
      const keyboardActive = vv.height < window.screen.height * 0.75;
      setIsKeyboardOpen(keyboardActive);
      if (keyboardActive && window.innerWidth < 768) setIsConsoleOpen(false);
    };
    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  // 프로그래밍 언어 변경 시 기본 템플릿 코드로 변경
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang]);
  };

  // CodeMirror 언어 문법 하이라이팅 및 단축키(Ctrl/Cmd + Enter) 확장 설정
  const getExtensions = () => {
    const langExt = language === 'python' ? python() : language === 'javascript' ? javascript() : cpp();
    const runShortcut = Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { handleExecute(); return true; } }]));
    return [langExt, runShortcut];
  };

  // 모바일 빠른 기호 바 버튼 클릭 시 기호 삽입 또는 커서 이동
  const handleQuickButton = (e, item) => {
    e.preventDefault();
    const view = editorViewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    if (item.type === 'insert') {
      const insertText = item.value;
      const newCursorPos = from + insertText.length + (item.offset || 0);
      view.dispatch({ changes: { from, to, insert: insertText }, selection: EditorSelection.cursor(newCursorPos) });
    } else if (item.type === 'move') {
      const nextPos = Math.max(0, Math.min(view.state.doc.length, from + item.value));
      view.dispatch({ selection: EditorSelection.cursor(nextPos) });
    }
    view.focus();
  };

  return (
    <div style={{ height: `${viewportHeight}px` }} className="flex flex-col w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* 상단 헤더: 언어 선택, 파일명 입력, 클라우드 저장/불러오기, 로그인, 실행 버튼 */}
      <header className="flex items-center justify-between px-3 md:px-5 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Code2 className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm md:text-base tracking-tight">Cloud IDE</span>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="ml-1 md:ml-3 bg-slate-800 text-xs md:text-sm text-slate-200 px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="python">Python 3.11</option>
            <option value="javascript">Node.js 20</option>
            <option value="cpp">C++ (GCC)</option>
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hidden sm:block bg-slate-800 text-xs text-slate-200 px-2 py-1 rounded border border-slate-700 w-28 md:w-36"
            placeholder="파일명 입력"
          />
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button onClick={handleSaveToCloud} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded cursor-pointer">
                <Save className="w-3.5 h-3.5" /> <span className="hidden md:inline">저장</span>
              </button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded border border-slate-700 cursor-pointer">
                <FolderOpen className="w-3.5 h-3.5" /> <span className="hidden md:inline">목록</span>
              </button>
              <button onClick={handleLogout} title="로그아웃" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-red-400 rounded border border-slate-700 cursor-pointer">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded font-semibold cursor-pointer">
              <LogIn className="w-3.5 h-3.5" /> <span>로그인</span>
            </button>
          )}

          {/* 모바일 빠른 기호 바 표시 토글 버튼 */}
          <button onClick={() => setShowSymbolBar(!showSymbolBar)} className={`p-1.5 rounded border text-xs flex items-center gap-1 cursor-pointer ${showSymbolBar ? 'bg-slate-800 border-indigo-500/50 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
            <Keyboard className="w-4 h-4" />
          </button>

          {/* 코드 실행 버튼 (로그인 전 또는 실행 중일 때 비활성화) */}
          <button
            onClick={handleExecute}
            disabled={!user || isRunning}
            title={!user ? '로그인이 필요합니다' : '코드 실행 (Ctrl+Enter)'}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs md:text-sm font-semibold px-3.5 py-1.5 rounded shadow transition cursor-pointer"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>실행</span>
          </button>
        </div>
      </header>

      {/* 메인 작업 영역: 코드 에디터 + 실행 결과 콘솔 */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* CodeMirror 기반 코드 에디터 */}
          <main className="flex-1 min-h-0 relative overflow-hidden">
            <CodeMirror
              value={code}
              height="100%"
              theme={oneDark}
              extensions={getExtensions()}
              onChange={(val) => setCode(val)}
              onCreateEditor={(view) => { editorViewRef.current = view; }}
              basicSetup={{ lineNumbers: true, foldGutter: window.innerWidth >= 768, highlightActiveLine: true, autocompletion: true }}
              className="h-full text-sm md:text-base"
            />
          </main>

          {/* 하단 빠른 기호 입력 바 */}
          {showSymbolBar && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border-t border-slate-800 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_SYMBOLS.map((item, idx) => (
                <button key={idx} onTouchStart={(e) => handleQuickButton(e, item)} onMouseDown={(e) => handleQuickButton(e, item)} className="px-3 py-1.5 bg-slate-800 active:bg-indigo-600 text-slate-200 rounded text-sm font-mono font-semibold shrink-0 border border-slate-700 select-none cursor-pointer">
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 우측(데스크톱) / 하단(모바일) 실행 결과 출력 콘솔 */}
        <section className={`flex flex-col bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 shrink-0 transition-all duration-200 ${isConsoleOpen ? (isKeyboardOpen ? 'h-28 md:h-full md:w-80 lg:w-96' : 'h-48 md:h-full md:w-80 lg:w-96') : 'h-9 md:h-full md:w-10'}`}>
          <div onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="flex items-center justify-between px-3 h-9 bg-slate-900 cursor-pointer select-none shrink-0 border-b border-slate-800/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 truncate">
              <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className={isConsoleOpen ? 'inline' : 'md:hidden'}>실행 결과 콘솔</span>
            </div>
            {isConsoleOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
          {isConsoleOpen && <pre className="flex-1 p-3 text-xs md:text-sm font-mono text-slate-300 overflow-y-auto whitespace-pre-wrap break-all bg-black/40">{output}</pre>}
        </section>
      </div>

      {/* 클라우드 저장 코드 목록 불러오기 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-200">클라우드 저장된 코드 목록</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {snippets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">저장된 코드가 없습니다.</p>
              ) : (
                snippets.map((item) => (
                  <div key={item.id} onClick={() => { setTitle(item.title); setLanguage(item.language); setCode(item.code); setIsModalOpen(false); }} className="p-3 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 cursor-pointer transition">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-xs text-indigo-300">{item.title}</span>
                      <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded">{item.language}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate font-mono">{item.code}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
