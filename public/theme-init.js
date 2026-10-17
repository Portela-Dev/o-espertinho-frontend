// Apply the preferred palette before the first paint, independently of Angular hydration.
(()=>{
 let saved;try{saved=localStorage.getItem('espertinho-theme');}catch{}
 const theme=saved==='light'||saved==='dark'?saved:window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
 document.documentElement.dataset.theme=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#101a15':'#173a2b');
})();
