/* 
ConfirmNokri — script.js (Pro, robust single-file client app)
Author: You ✦ Helper: GPT-5 Thinking
Last updated: 2025-08-27

How to use (HTML expectations):
- Header nav container:    <nav id="navLinks"></nav>
- Header actions wrapper:  <div class="header-actions">…</div>  (theme/share buttons yahi hote hain)
- Home hero buttons:       Give "Create Account" anchor id="ctaCreateAccount" (recommended),
                           OR put data-auth="guest-only" on that CTA.
- Common optional sections (if page has them): 
  #homeJobs, #homeCompanies, #homeTestimonials, #jobsList, #applicationsList, #inboxList,
  #dashboardContent, #dashTitle, #profileForm, #profilePreview, 
  #accountForm, #addressForm, #prefForm, #subscriptionForm, #changePassForm, 
  #loginForm, #signupSeekerForm, #signupRecruiterForm, #resetForm, #year, #jobSearch

Security (client-only demo):
- Passwords are stored as SHA-256 hash (not plaintext). Still, this is localStorage; use proper backend for production.
*/

(() => {
  // ----------------- Constants & Storage Keys -----------------
  const K = {
    THEME: "cn-theme",
    CURRENT: "cn-current-v2",      // stores {email, role, sid}
    USERS: "cn-users-index-v2",    // list of user emails
    SEED: "cn-seeded-v4",          // bump on schema change
    JOBS: "cn-jobs-v2",
    JOBS_MINE: "cn-jobs-mine",     // recruiter posted jobs (demo)
    APPS: "cn-applications-v2",    // applications
    SAVED: "cn-saved-jobs-v2",     // saved job ids
    MSGS: "cn-messages-v2",        // inbox/messages
    COMP: "cn-companies-v2",
    NOTIF: "cn-notifications-v2",
    OTP: "cn-reset-otp-code",
    OTPUSER: "cn-reset-otp-user",
    OTPTS: "cn-reset-otp-exp",     // expiry (ms)
    VERSION: "cn-version",
  };

  // ----------------- Helpers -----------------
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const jget = (k, d=null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const jset = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const del  = (k) => localStorage.removeItem(k);
  const emailKey = (e) => `cn-user-${normalizeEmail(e)}`;
  const getUser = (email) => jget(emailKey(email));
  const saveUser = (u) => { jset(emailKey(u.email), u); indexUser(u.email); };
  const indexUser = (email) => { const list = new Set(jget(K.USERS, [])); list.add(normalizeEmail(email)); jset(K.USERS, [...list]); };
  const currentUser = () => jget(K.CURRENT);
  const setSession = (email, role) => { const sid = cryptoRandom(); jset(K.CURRENT, { email: normalizeEmail(email), role, sid }); };
  const clearSession = () => del(K.CURRENT);
  const isAuthed = () => !!currentUser();
  const isSeeker = () => currentUser()?.role === "seeker";
  const isRecruiter = () => currentUser()?.role === "recruiter";
  const cryptoRandom = () => (self.crypto?.getRandomValues ? [...self.crypto.getRandomValues(new Uint32Array(4))].map(x=>x.toString(16)).join("") : String(Math.random()).slice(2));
  const normalizeEmail = (e) => String(e || "").trim().toLowerCase();
  const now = () => Date.now();

  // SHA-256 hashing (UTF-8)
  async function hashPassword(pw) {
    const enc = new TextEncoder().encode(String(pw));
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  // Toast (lightweight)
  function toast(msg) {
    let t = $("#cn-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "cn-toast";
      Object.assign(t.style, {
        position:"fixed", bottom:"16px", left:"50%", transform:"translateX(-50%)",
        background:"#111", color:"#fff", padding:"10px 14px", borderRadius:"10px",
        fontSize:"14px", zIndex:9999, boxShadow:"0 6px 20px rgba(0,0,0,.25)", opacity:"0", transition:"opacity .2s"
      });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    setTimeout(()=> t.style.opacity="0", 1700);
  }

  // ----------------- Theme & Share -----------------
  function setupTheme() {
    const btn = $("#themeToggle");
    const saved = localStorage.getItem(K.THEME) || "light";
    if(saved==="dark") document.body.classList.add("dark");
    if(btn){
      btn.textContent = document.body.classList.contains("dark") ? "☀ Light" : "🌙 Dark";
      btn.addEventListener("click", ()=>{
        document.body.classList.toggle("dark");
        const dark = document.body.classList.contains("dark");
        localStorage.setItem(K.THEME, dark ? "dark" : "light");
        btn.textContent = dark ? "☀ Light" : "🌙 Dark";
      });
    }
  }
  function setupShare() {
    const b = $("#shareBtn"); if(!b) return;
    b.addEventListener("click", async()=>{
      const data={title:"ConfirmNokri", text:"A lightweight job portal demo", url:location.href};
      try{
        if(navigator.share) await navigator.share(data);
        else{ await navigator.clipboard.writeText(data.url); toast("Link copied"); }
      }catch{ /* ignore */ }
    });
  }

  // ----------------- Navigation (Dynamic) -----------------
  function renderNav() {
    const nav = $("#navLinks"); if(!nav) return;
    const u = currentUser();
    if(u){
      nav.innerHTML = `
        <a href="index.html">Home</a>
        <a href="dashboard.html">Dashboard</a>
        <a href="jobs.html">Jobs</a>
        ${isRecruiter() ? `<a href="applicants.html">Applicants</a>` : `<a href="inbox.html">Inbox</a>`}
        <a href="profile.html">My Profile</a>
        <a href="settings.html">Settings</a>
        <a href="#" id="logoutLink">Logout</a>
      `;
      $("#logoutLink")?.addEventListener("click",(e)=>{e.preventDefault(); clearSession(); toast("Logged out"); location.href="index.html";});
    }else{
      nav.innerHTML = `
        <a href="index.html">Home</a>
        <a href="jobs.html">Jobs</a>
        <a href="login.html">Login</a>
        <a href="signup.html">Sign Up</a>
      `;
    }

    // Ensure Notification bell exists in header actions
    ensureNotificationsUI();
  }

  // ----------------- Seed Data -----------------
  function seedDemo() {
    if(localStorage.getItem(K.SEED)) return;

    const jobs = [
      {id:"J101", title:"Frontend Developer", company:"TechSoft Pvt Ltd", location:"Remote", type:"Full-time", skills:["React","JS","CSS"], exp:"1–3 yrs", tag:"Hot"},
      {id:"J102", title:"HR Recruiter", company:"ConfirmNokri HR", location:"Delhi", type:"Part-time", skills:["Screening","Excel"], exp:"0–2 yrs", tag:"New"},
      {id:"J103", title:"Backend Engineer", company:"StartUp Hub", location:"Bengaluru", type:"Full-time", skills:["Node","MongoDB","APIs"], exp:"2–4 yrs", tag:"Urgent"},
      {id:"J104", title:"Data Analyst", company:"InsightWorks", location:"Gurugram", type:"Full-time", skills:["SQL","Excel","PowerBI"], exp:"1–3 yrs", tag:"Featured"},
      {id:"J105", title:"Product Manager", company:"NovaStack", location:"Mumbai", type:"Full-time", skills:["Roadmaps","Agile"], exp:"3–6 yrs", tag:"Priority"},
    ];
    const companies = [
      {name:"TechSoft Pvt Ltd", openings:12, rating:4.3},
      {name:"ConfirmNokri HR", openings:4, rating:4.1},
      {name:"StartUp Hub", openings:7, rating:4.5},
      {name:"InsightWorks", openings:6, rating:4.2},
    ];
    const messages = [
      {from:"HR @ TechSoft", text:"Thanks for applying. Can we schedule an interview?", time:"Today 10:20 AM"},
      {from:"Recruiter @ StartUp Hub", text:"Share availability for a quick call.", time:"Yesterday 6:05 PM"},
      {from:"Priya (Candidate)", text:"Looking forward to the interview.", time:"Aug 20, 4:21 PM"},
    ];
    const demoSeeker = {
      role:"seeker", name:"Rohit Verma", email:"rohit@demo.com",
      passwordHash:"", // set below
      phone:"+91 98765 12345", bio:"Frontend dev with 2y experience in React.",
      address:"Noida, UP", skills:"React, JavaScript, CSS, HTML", resume:"Rohit_Verma_Resume.pdf",
      alerts:true, savedSearches:["react remote", "frontend fresher"]
    };
    const demoRecruiter = {
      role:"recruiter", name:"Anita Sharma", email:"anita.hr@confirm.com",
      passwordHash:"", // set below
      company:"ConfirmNokri HR", phone:"+91 98220 00011"
    };

    // set default hashes ("123456")
    Promise.all([hashPassword("123456"), hashPassword("123456")]).then(([h1,h2])=>{
      demoSeeker.passwordHash=h1; demoRecruiter.passwordHash=h2;
      saveUser(demoSeeker); saveUser(demoRecruiter);
    });

    jset(K.JOBS, jobs);
    jset(K.COMP, companies);
    jset(K.MSGS, messages);
    jset(K.APPS, [
      {id:cryptoRandom(), jobId:"J101", title:"Frontend Developer", date:new Date().toLocaleString(), name:"Rohit Verma", email:"rohit@demo.com", resume:"Rohit_Verma_Resume.pdf", status:"Under Review"},
      {id:cryptoRandom(), jobId:"J103", title:"Backend Engineer", date:new Date().toLocaleString(), name:"Priya Gupta", email:"priya@demo.com", resume:"Priya_Gupta.pdf", status:"Submitted"}
    ]);
    jset(K.SAVED, ["J104"]);
    jset(K.NOTIF, [
      {id:cryptoRandom(), text:"Welcome to ConfirmNokri!", href:"dashboard.html", read:false, ts:now()},
      {id:cryptoRandom(), text:"3 new jobs match your skills", href:"jobs.html", read:false, ts:now()}
    ]);

    // Recruiter demo posted jobs
    jset(K.JOBS_MINE, [
      {id:"P201", title:"QA Engineer", location:"Remote", type:"Contract", applicants:3, status:"Open"},
      {id:"P202", title:"UI/UX Designer", location:"Mumbai", type:"Full-time", applicants:5, status:"Open"}
    ]);

    localStorage.setItem(K.SEED, "1");
    localStorage.setItem(K.VERSION, "4");
  }

  // ----------------- Auth: Signup / Login / OTP Reset -----------------
  function setupSignupTabs(){
    const sb=$("#seekerBtn"), rb=$("#recruiterBtn"), sf=$("#signupSeekerForm"), rf=$("#signupRecruiterForm");
    if(!sb||!rb||!sf||!rf) return;
    const act=(r)=>{ const s=r==="seeker"; sb.classList.toggle("btn-primary",s); rb.classList.toggle("btn-primary",!s); sf.classList.toggle("hidden",!s); rf.classList.toggle("hidden",s); };
    sb.addEventListener("click",()=>act("seeker")); rb.addEventListener("click",()=>act("recruiter")); act("seeker");
  }
  function setupSignup(){
    setupSignupTabs();
    const sf=$("#signupSeekerForm"), rf=$("#signupRecruiterForm");
    if(sf){
      sf.addEventListener("submit", async (e)=>{
        e.preventDefault();
        const name=sf.name.value.trim(), email=normalizeEmail(sf.email.value), password=sf.password.value;
        const phone=sf.phone?.value.trim()||"", bio=sf.bio?.value.trim()||"", address=sf.address?.value.trim()||"", skills=sf.skills?.value.trim()||"";
        const resume = sf.resume?.files?.length ? sf.resume.files[0].name : "Not uploaded";
        const passwordHash = await hashPassword(password);
        const u={role:"seeker", name, email, passwordHash, phone, bio, address, skills, resume, alerts:true, savedSearches:[]};
        saveUser(u);
        toast("Seeker account created");
        location.href="login.html";
      });
    }
    if(rf){
      rf.addEventListener("submit", async (e)=>{
        e.preventDefault();
        const name=rf.name.value.trim(), email=normalizeEmail(rf.email.value), password=rf.password.value, company=rf.company.value.trim(), phone=rf.phone?.value.trim()||"";
        const passwordHash = await hashPassword(password);
        const u={role:"recruiter", name, email, passwordHash, company, phone};
        saveUser(u);
        toast("Recruiter account created");
        location.href="login.html";
      });
    }
  }
  function setupLogin(){
    const f=$("#loginForm"); if(!f) return;
    f.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const email=normalizeEmail(f.querySelector('input[type="email"]').value);
      const pass=f.querySelector('input[type="password"]').value;
      const u=getUser(email);
      const h = await hashPassword(pass);
      if(u && u.passwordHash===h){ setSession(u.email, u.role); toast("Welcome, "+u.name); location.href="dashboard.html"; }
      else toast("Invalid credentials");
    });
    $("#forgotPassword")?.addEventListener("click",()=>{
      const input=normalizeEmail(prompt("Enter your registered Email:")||"");
      if(!input) return;
      const u=getUser(input);
      if(!u){ toast("Account not found"); return; }
      const otp = String(Math.floor(100000+Math.random()*900000));
      const exp = now() + 5*60*1000; // 5 min
      localStorage.setItem(K.OTP, otp); localStorage.setItem(K.OTPUSER, u.email); localStorage.setItem(K.OTPTS, String(exp));
      alert(`OTP sent to ${u.email} (Demo OTP: ${otp})`); // demo
      location.href="reset.html";
    });
  }
  function setupReset(){
    const f=$("#resetForm"); if(!f) return;
    f.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const otp=$("#resetOtp").value.trim(), np=$("#resetPass").value;
      const sOtp=localStorage.getItem(K.OTP), email=localStorage.getItem(K.OTPUSER), exp=Number(localStorage.getItem(K.OTPTS)||0);
      if(!email || otp!==sOtp || now()>exp){ toast("Invalid/expired OTP"); return; }
      const u=getUser(email); if(!u){ toast("Account not found"); return; }
      u.passwordHash = await hashPassword(np);
      saveUser(u);
      del(K.OTP); del(K.OTPUSER); del(K.OTPTS);
      toast("Password updated"); location.href="login.html";
    });
  }

  // ----------------- Role aware visibility toggles -----------------
  function applyAuthVisibility(){
    const authed = isAuthed();
    // generic auth flags
    $$('[data-auth="guest-only"]').forEach(el=> el.style.display = authed ? "none" : "");
    $$('[data-auth="authed-only"]').forEach(el=> el.style.display = authed ? "" : "none");

    // role flags
    const seekerOn = isSeeker();
    const recruiterOn = isRecruiter();
    $$('[data-role="seeker"]').forEach(el=> el.style.display = seekerOn ? "" : "none");
    $$('[data-role="recruiter"]').forEach(el=> el.style.display = recruiterOn ? "" : "none");

    // Home CTA protection (legacy)
    const createBtn = $("#ctaCreateAccount") || $$('a[href*="signup.html"]').find(a=>a.textContent.toLowerCase().includes("create"));
    if(createBtn) createBtn.style.display = authed ? "none" : "";

    // Also hide Signup/Login links in hero (if any)
    $$('a[href*="signup.html"], a[href*="login.html"]').forEach(a=>{
      if(a.closest("header")) return; // header nav handled separately
      a.style.display = authed ? "none" : "";
    });
  }

  // ----------------- Notifications -----------------
  function ensureNotificationsUI(){
    let bar = $(".header-actions"); if(!bar) return;
    if($("#notifBtn")) return;

    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.style.display = "inline-block";
    wrap.style.marginLeft = "8px";

    const btn = document.createElement("button");
    btn.id = "notifBtn";
    btn.className = "btn btn-outline";
    btn.textContent = "🔔";
    btn.title = "Notifications";

    const dot = document.createElement("span");
    dot.id="notifDot";
    Object.assign(dot.style, { position:"absolute", top:"-2px", right:"-2px", width:"10px", height:"10px", background:"#f40", borderRadius:"999px", display:"none" });

    const panel = document.createElement("div");
    panel.id = "notifPanel";
    Object.assign(panel.style, {
      position:"absolute", right:0, top:"110%",
      minWidth:"260px", maxWidth:"320px", background:"var(--card, #fff)", borderRadius:"12px",
      boxShadow:"0 10px 25px rgba(0,0,0,.15)", padding:"8px", display:"none", zIndex:999
    });
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;">
        <strong>Notifications</strong>
        <div>
          <button class="btn btn-outline btn-sm" id="markAllRead">Mark all read</button>
          <button class="btn btn-danger btn-sm" id="clearAllNotif">Clear</button>
        </div>
      </div>
      <div id="notifList" style="max-height:280px; overflow:auto;"></div>
    `;

    wrap.appendChild(btn); wrap.appendChild(dot); wrap.appendChild(panel);
    bar.appendChild(wrap);

    btn.addEventListener("click", ()=> {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      renderNotifications();
    });
    document.addEventListener("click", (e)=>{
      if(!wrap.contains(e.target)) panel.style.display="none";
    });

    $("#markAllRead")?.addEventListener("click", ()=>{
      const list = jget(K.NOTIF, []);
      list.forEach(n=> n.read = true);
      jset(K.NOTIF, list);
      renderNotifications();
    });
    $("#clearAllNotif")?.addEventListener("click", ()=>{
      jset(K.NOTIF, []);
      renderNotifications();
    });

    // initial dot
    updateNotifDot();
  }
  function updateNotifDot(){
    const list=jget(K.NOTIF, []);
    const unread = list.some(n=>!n.read);
    const dot=$("#notifDot"); if(dot) dot.style.display = unread ? "block" : "none";
  }
  function renderNotifications(){
    const list=jget(K.NOTIF, []);
    const box=$("#notifList"); if(!box) return;
    if(!list.length){ box.innerHTML = `<div class="muted" style="padding:8px 10px;">No notifications</div>`; updateNotifDot(); return; }
    box.innerHTML = list
      .sort((a,b)=>b.ts-a.ts)
      .map(n=>`
        <div class="card" data-id="${n.id}" style="margin:6px 0; cursor:pointer; ${n.read?'opacity:.7':''}">
          <div>${n.text}</div>
          <small class="muted">${new Date(n.ts).toLocaleString()}</small>
        </div>
      `).join("");
    $$("#notifList .card").forEach(item=>{
      item.addEventListener("click", ()=>{
        const id=item.getAttribute("data-id");
        const all=jget(K.NOTIF, []);
        const one=all.find(x=>x.id===id);
        if(one){ one.read=true; jset(K.NOTIF, all); }
        updateNotifDot();
        if(one?.href) location.href = one.href;
      });
    });
    updateNotifDot();
  }

  // ----------------- Jobs (list/save/apply/search) -----------------
  function renderJobs(){
    const box=$("#jobsList"); if(!box) return;
    const jobs=jget(K.JOBS, []);
    const saved=new Set(jget(K.SAVED, []));
    const html = jobs.map(j=>`
      <div class="card list-row">
        <div>
          <h3>${j.title}</h3>
          <p class="muted">${j.company} · ${j.location} · <span class="badge badge-prp">${j.type}</span> <span class="badge badge-ylw">${j.tag}</span></p>
          <small>Skills: ${j.skills.join(", ")} · Exp: ${j.exp}</small>
        </div>
        <div class="flex">
          <button class="btn ${saved.has(j.id)?'btn-outline':''} save-btn" data-id="${j.id}">${saved.has(j.id)?'Saved':'Save'}</button>
          <button class="btn btn-primary apply-btn" data-id="${j.id}" ${isRecruiter()?'disabled title="Recruiters cannot apply"':''}>Apply</button>
        </div>
      </div>`).join("");
    box.innerHTML = html;

    $$(".apply-btn", box).forEach(b=>{
      b.addEventListener("click",()=>{
        if(!isSeeker()){ toast("Login as Job Seeker to apply."); location.href="login.html"; return; }
        const jobId=b.dataset.id; const job=jget(K.JOBS,[]).find(x=>x.id===jobId);
        const u=getUser(currentUser().email);
        const apps=jget(K.APPS,[]);
        apps.push({id:cryptoRandom(), jobId:job.id, title:job.title, date:new Date().toLocaleString(), name:u.name, email:u.email, resume:u.resume||"Not uploaded", status:"Submitted"});
        jset(K.APPS, apps);
        // Notify recruiter demo
        const notif=jget(K.NOTIF, []);
        notif.push({id:cryptoRandom(), text:`Applied to ${job.title}`, href:"dashboard.html", read:false, ts:now()});
        jset(K.NOTIF, notif);
        updateNotifDot();
        toast("Applied to: "+job.title);
      });
    });
    $$(".save-btn", box).forEach(b=>{
      b.addEventListener("click",()=>{
        if(!isSeeker()){ toast("Login as Job Seeker to save jobs."); location.href="login.html"; return; }
        const id=b.dataset.id;
        const saved=new Set(jget(K.SAVED,[]));
        saved.has(id) ? saved.delete(id) : saved.add(id);
        jset(K.SAVED, Array.from(saved));
        renderJobs();
      });
    });

    // search
    $("#jobSearch")?.addEventListener("input",(e)=>{
      const q=e.target.value.toLowerCase();
      $$(".card", box).forEach(c=>{
        const txt=c.textContent.toLowerCase();
        c.style.display = txt.includes(q) ? "" : "none";
      });
    });
  }

  // ----------------- Applicants (Recruiter view) -----------------
  function showApplicants(){
    const list=$("#applicationsList"); if(!list) return;
    const apps=jget(K.APPS,[]);
    const demoExtra=[
      {id:"DX1", title:"Data Analyst",date:"Aug 22, 11:03 AM",name:"Amit Singh",email:"amit@demo.com",resume:"Amit_Singh.pdf", status:"Submitted"},
      {id:"DX2", title:"Product Manager",date:"Aug 21, 4:09 PM",name:"Neha Rao",email:"neha@demo.com",resume:"Neha_Rao.pdf", status:"Under Review"}
    ];
    const all=[...apps, ...demoExtra];
    list.innerHTML = all.map(a=>`
      <div class="card list-row">
        <div>
          <strong>${a.name}</strong> <span class="badge">${a.email}</span><br/>
          <span class="muted">Applied for <b>${a.title}</b> on ${a.date}</span><br/>
          <small>Resume: ${a.resume}</small>
        </div>
        <div class="flex">
          <button class="btn msg-btn" data-id="${a.id}">Message</button>
          <button class="btn btn-outline short-btn" data-id="${a.id}">Shortlist</button>
          <button class="btn btn-danger rej-btn" data-id="${a.id}">Reject</button>
        </div>
      </div>
    `).join("");

    $$(".msg-btn", list).forEach(b=> b.addEventListener("click", ()=>toast("Open chat (demo)")));
    $$(".short-btn", list).forEach(b=> b.addEventListener("click", ()=>{
      toast("Applicant shortlisted");
      const notif=jget(K.NOTIF, []); notif.push({id:cryptoRandom(), text:"You shortlisted a candidate", href:"applicants.html", read:false, ts:now()}); jset(K.NOTIF, notif); updateNotifDot();
    }));
    $$(".rej-btn", list).forEach(b=> b.addEventListener("click", ()=>toast("Applicant rejected")));
  }

  // ----------------- Inbox (demo) -----------------
  function renderInbox(){
    const box=$("#inboxList"); if(!box) return;
    const msgs=jget(K.MSGS,[]);
    box.innerHTML = msgs.map(m=>`<div class="card"><p><strong>${m.from}:</strong> ${m.text}<br><small class="muted">${m.time}</small></p></div>`).join("");
  }

  // ----------------- Home: trending + companies + testimonials -----------------
  function renderHome(){
    // Hide guest-only CTA if logged in
    applyAuthVisibility();

    const jc=$("#homeJobs"); if(jc){ 
      const jobs=jget(K.JOBS,[]).slice(0,3);
      jc.innerHTML = jobs.map(j=>`
        <div class="card">
          <div class="flex"><span class="badge badge-ylw">${j.tag}</span><span class="badge">${j.type}</span></div>
          <h3 style="margin:.5rem 0">${j.title}</h3>
          <p class="muted">${j.company} · ${j.location}</p>
          <small>Skills: ${j.skills.join(", ")}</small>
          <div class="flex" style="margin-top:.8rem">
            <a class="btn btn-outline" href="jobs.html">Details</a>
            <a class="btn btn-primary" href="jobs.html">Apply</a>
          </div>
        </div>`).join("");
    }
    const cc=$("#homeCompanies"); if(cc){
      const comps=jget(K.COMP,[]);
      cc.innerHTML = comps.map(c=>`
        <div class="card">
          <h3>${c.name}</h3>
          <p class="muted">Openings: ${c.openings} · Rating: ${c.rating}⭐</p>
          <a class="btn btn-outline" href="jobs.html">View Jobs</a>
        </div>`).join("");
    }
    const tc=$("#homeTestimonials"); if(tc){
      tc.innerHTML = `
        <div class="card">“Got shortlisted in 48h. Smooth apply!” — <strong>Rohit (Seeker)</strong></div>
        <div class="card">“Great inbound candidates for niche roles.” — <strong>Anita (Recruiter)</strong></div>
        <div class="card">“UI is clean, fast & modern.” — <strong>Vikram (PM)</strong></div>
      `;
    }
  }

  // ----------------- Profile -----------------
  function setupProfile(){
    const f=$("#profileForm"); if(!f) return;
    const sess=currentUser(); if(!sess){ alert("Please login"); location.href="login.html"; return; }
    const u=getUser(sess.email);
    f.name.value=u?.name||""; f.email.value=u?.email||""; (f.phone&& (f.phone.value=u?.phone||"")); 
    (f.address&&(f.address.value=u?.address||"")); (f.skills&&(f.skills.value=u?.skills||"")); (f.bio&&(f.bio.value=u?.bio||""));
    const preview=$("#profilePreview");
    const render=(usr)=>{
      if(!preview) return;
      preview.innerHTML=`
        <h3>Preview</h3>
        <p><strong>${usr.name||"-"}</strong> · <span class="badge">${usr.email||"-"}</span><br/>
        <small>${usr.phone||"-"} · ${usr.address||"-"}</small></p>
        <p class="muted">${usr.bio||"No bio added."}</p>
        <p><small>Skills: ${usr.skills||"-"}</small></p>
        <p><small>Resume: ${usr.resume||"Not uploaded"}</small></p>
      `;
    };
    render(u||{});
    f.addEventListener("submit",(e)=>{
      e.preventDefault();
      u.name=f.name.value.trim(); u.email=normalizeEmail(f.email.value); 
      if(f.phone) u.phone=f.phone.value.trim();
      if(f.address) u.address=f.address.value.trim();
      if(f.skills) u.skills=f.skills.value.trim();
      if(f.bio) u.bio=f.bio.value.trim();
      if(f.resume?.files?.length) u.resume=f.resume.files[0].name;
      saveUser(u); setSession(u.email, u.role); render(u); toast("Profile updated");
    });
  }

  // ----------------- Dashboard (role-based) -----------------
  function setupDashboard(){
    const box=$("#dashboardContent"); if(!box) return;
    const title=$("#dashTitle");
    const sess=currentUser();
    if(!sess){ if(title) title.textContent="Welcome"; box.innerHTML="<div class='card'>Please login to see your dashboard.</div>"; return; }
    const u=getUser(sess.email);
    if(title) title.textContent = isRecruiter() ? "Recruiter Dashboard" : "Job Seeker Dashboard";

    const apps=jget(K.APPS,[]);
    const myApps = isSeeker() ? apps.filter(a=>a.email===u.email) : apps;
    const savedIds = new Set(jget(K.SAVED,[]));
    const jobs=jget(K.JOBS,[]);
    const saved = isSeeker() ? jobs.filter(j=>savedIds.has(j.id)) : [];
    const inboxCount = jget(K.MSGS,[]).length;

    if(isSeeker()){
      const completion = Math.min(100, (["name","email","phone","skills","resume"].filter(k=>u[k]).length/5)*100).toFixed(0);
      box.innerHTML = `
        <div class="grid grid-2">
          <div class="card kpi"><span class="num">📝 ${myApps.length}</span><div>Applications</div></div>
          <div class="card kpi"><span class="num">⭐ ${saved.length}</span><div>Saved Jobs</div></div>
          <div class="card kpi"><span class="num">✨ ${completion}%</span><div>Profile Completion</div></div>
          <div class="card kpi"><span class="num">📨 ${inboxCount}</span><div>Inbox</div></div>
        </div>

        <div class="card" style="margin-top:var(--gap)">
          <h3>Quick Tools</h3>
          <div class="flex" style="gap:.5rem; flex-wrap:wrap">
            <a class="btn" href="jobs.html">Find Jobs</a>
            <a class="btn" href="profile.html">Update Resume</a>
            <button class="btn" id="toggleAlerts">${u.alerts===false?"Enable Job Alerts":"Disable Job Alerts"}</button>
            <button class="btn" id="saveSearchBtn">Save Current Search</button>
            <a class="btn btn-outline" href="inbox.html">Open Inbox</a>
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:var(--gap)">
          <div class="card">
            <h3>Recent Applications</h3>
            ${(myApps.length? myApps.slice(-5).reverse().map(a=>`<div class="list-row"><div><strong>${a.title}</strong><div class="muted">${a.date}</div></div><span class="badge badge-ylw">${a.status||"Under Review"}</span></div>`).join("") : "<p class='muted'>No applications yet. Apply from Jobs.</p>")}
          </div>
          <div class="card">
            <h3>Saved Jobs</h3>
            ${(saved.length? saved.map(s=>`<div class="list-row"><div><strong>${s.title}</strong><div class="muted">${s.company} · ${s.location}</div></div><a class="btn btn-primary" href="jobs.html">Apply</a></div>`).join("") : "<p class='muted'>No saved jobs.</p>")}
          </div>
        </div>

        ${u.savedSearches?.length ? `<div class="card" style="margin-top:var(--gap)"><h3>Saved Searches</h3>${u.savedSearches.map(q=>`<span class="badge" style="margin:4px">${q}</span>`).join("")}</div>` : ""}
      `;

      $("#toggleAlerts")?.addEventListener("click", ()=>{
        u.alerts = !u.alerts; saveUser(u);
        toast(`Job Alerts ${u.alerts?"enabled":"disabled"}`);
        $("#toggleAlerts").textContent = u.alerts ? "Disable Job Alerts" : "Enable Job Alerts";
      });
      $("#saveSearchBtn")?.addEventListener("click", ()=>{
        const q = prompt("Save search query:", "react remote");
        if(!q) return;
        u.savedSearches = u.savedSearches||[];
        if(!u.savedSearches.includes(q)) u.savedSearches.push(q);
        saveUser(u);
        toast("Search saved");
        setupDashboard(); // re-render to show
      });

    } else { // Recruiter
      const myPosts = jget(K.JOBS_MINE, []);
      const totalApplicants = apps.length;
      box.innerHTML = `
        <div class="grid grid-2">
          <div class="card kpi"><span class="num">💼 ${myPosts.length}</span><div>Active Job Posts</div></div>
          <div class="card kpi"><span class="num">📥 ${totalApplicants}</span><div>Total Applicants</div></div>
          <div class="card kpi"><span class="num">📈 72%</span><div>Job View → Apply</div></div>
          <div class="card kpi"><span class="num">🏢 ${u.company||"Your Company"}</span><div>Org</div></div>
        </div>

        <div class="card" style="margin-top:var(--gap)">
          <h3>Recruiter Tools</h3>
          <div class="flex" style="gap:.5rem; flex-wrap:wrap">
            <button class="btn" id="btnPostJob">Post Job</button>
            <button class="btn" id="btnManageJobs">Manage Jobs</button>
            <a class="btn" href="applicants.html">View Applicants</a>
            <button class="btn" id="btnTalentPool">Talent Pool</button>
            <button class="btn" id="btnBulkMsg">Bulk Message</button>
            <a class="btn btn-outline" href="settings.html">Company Profile</a>
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:var(--gap)">
          <div class="card">
            <h3>Latest Applicants</h3>
            ${apps.slice(-5).reverse().map(a=>`<div class="list-row"><div><strong>${a.name}</strong> <span class="badge">${a.email}</span><div class="muted">${a.title} · ${a.date}</div></div><div class="flex"><button class="btn">Message</button><button class="btn btn-outline">Shortlist</button></div></div>`).join("")}
            <div class="flex" style="margin-top:.8rem"><a class="btn btn-primary" href="applicants.html">View All</a></div>
          </div>
          <div class="card">
            <h3>My Job Posts</h3>
            ${myPosts.length ? myPosts.map(p=>`<div class="list-row"><div><strong>${p.title}</strong><div class="muted">${p.location} · ${p.type}</div></div><span class="badge">${p.status}</span></div>`).join("") : "<p class='muted'>No posts yet.</p>"}
          </div>
        </div>
      `;

      // Tool actions (demo)
      $("#btnPostJob")?.addEventListener("click", ()=>{
        const title = prompt("Job Title:");
        if(!title) return;
        const p = {id:cryptoRandom(), title, location:prompt("Location:","Remote")||"Remote", type:prompt("Type:","Full-time")||"Full-time", applicants:0, status:"Open"};
        const mine=jget(K.JOBS_MINE, []); mine.push(p); jset(K.JOBS_MINE, mine);
        toast("Job posted (demo)");
        const notif=jget(K.NOTIF, []); notif.push({id:cryptoRandom(), text:`Job posted: ${title}`, href:"dashboard.html", read:false, ts:now()}); jset(K.NOTIF, notif); updateNotifDot();
        setupDashboard();
      });
      $("#btnManageJobs")?.addEventListener("click", ()=>{
        const mine=jget(K.JOBS_MINE, []);
        alert(`Your posts:\n` + mine.map(m=>`• ${m.title} (${m.status})`).join("\n"));
      });
      $("#btnTalentPool")?.addEventListener("click", ()=>{
        alert("Talent Pool (demo): 42 candidates matching your tags.");
      });
      $("#btnBulkMsg")?.addEventListener("click", ()=>{
        alert("Bulk Message (demo): Sent to 12 shortlisted candidates.");
      });
    }
  }

  // ----------------- Settings -----------------
  function setupSettings(){
    // Preferences toggles in-page
    const autoDark=$("#autoDark"); if(autoDark){ const isDark=(localStorage.getItem(K.THEME)||"light")==="dark"; autoDark.checked=isDark; autoDark.addEventListener("change",()=>{const d=autoDark.checked; document.body.classList.toggle("dark",d); localStorage.setItem(K.THEME, d?"dark":"light"); const t=$("#themeToggle"); if(t) t.textContent=d?"☀ Light":"🌙 Dark";});}

    const notifToggle=$("#toggleNotif"); if(notifToggle){ const list=jget(K.NOTIF, []); notifToggle.checked = list.some(n=>!n.read) || list.length>0; notifToggle.addEventListener("change",()=>{ if(!notifToggle.checked) jset(K.NOTIF, []); else jset(K.NOTIF, jget(K.NOTIF, [])); renderNotifications(); updateNotifDot(); }); }

    // Account
    const af=$("#accountForm"); if(af){
      const sess=currentUser(); if(!sess){ alert("Login required"); location.href="login.html"; return; }
      const u=getUser(sess.email);
      af.name.value=u.name||""; af.email.value=u.email||""; af.phone&&(af.phone.value=u.phone||"");
      af.addEventListener("submit",(e)=>{ e.preventDefault(); u.name=af.name.value.trim(); u.email=normalizeEmail(af.email.value); if(af.phone) u.phone=af.phone.value.trim(); saveUser(u); setSession(u.email, u.role); toast("Account saved"); });
    }

    // Address
    const addr=$("#addressForm"); if(addr){
      const u=currentUser() ? getUser(currentUser().email) : null;
      addr.address.value=u?.address||""; 
      addr.addEventListener("submit",(e)=>{e.preventDefault(); u.address=addr.address.value.trim(); saveUser(u); setSession(u.email, u.role); toast("Address saved");});
    }

    // Subscription
    const subs=$("#subscriptionForm"); if(subs){
      subs.addEventListener("submit",(e)=>{e.preventDefault(); toast("Subscription preference saved");});
    }

    // Preferences
    const pref=$("#prefForm"); if(pref){
      const u=currentUser()?getUser(currentUser().email):{};
      pref.skills.value=u?.skills||""; 
      pref.addEventListener("submit",(e)=>{e.preventDefault(); u.skills=pref.skills.value.trim(); saveUser(u); setSession(u.email, u.role); toast("Preferences saved");});
    }

    // Change password
    const sec=$("#changePassForm"); if(sec){
      sec.addEventListener("submit", async (e)=>{
        e.preventDefault(); 
        const sess=currentUser(); if(!sess) return toast("Login required"); 
        const u=getUser(sess.email); 
        const cur=sec.curPass.value, nw=sec.newPass.value; 
        const curHash = await hashPassword(cur);
        if(u?.passwordHash===curHash){ u.passwordHash = await hashPassword(nw); saveUser(u); setSession(u.email, u.role); sec.reset(); toast("Password changed"); } 
        else toast("Current password incorrect");
      });
    }

    $("#deleteAccount")?.addEventListener("click",()=>{ if(!confirm("Delete your saved account?")) return; const u=currentUser(); if(!u) return; del(emailKey(u.email)); clearSession(); toast("Account deleted"); location.href="index.html"; });
    $("#logoutBtn")?.addEventListener("click",()=>{ clearSession(); toast("Logged out"); location.href="index.html"; });
  }

  // ----------------- Cross-tab sync -----------------
  window.addEventListener("storage", (e)=>{
    if(e.key===K.CURRENT || e.key===K.NOTIF){ renderNav(); applyAuthVisibility(); updateNotifDot(); }
  });

  // ----------------- INIT -----------------
  document.addEventListener("DOMContentLoaded", ()=>{
    seedDemo();
    setupTheme(); setupShare(); renderNav();

    // Auth flows
    setupSignup(); setupLogin(); setupReset();

    // Pages
    renderHome(); renderJobs(); showApplicants(); renderInbox();
    setupProfile(); setupDashboard(); setupSettings();

    // Auth-based visibility pass (for any custom markers in HTML)
    applyAuthVisibility();

    // Footer year
    const y=$("#year"); if(y) y.textContent=new Date().getFullYear();
  });
})();
