// ConfirmNokri — Full Demo Logic (Seeker + Recruiter + B2B)
/*
  Features:
  - Theme + Share
  - Demo seed data (jobs, companies, messages, applicants)
  - Auth: signup/login/logout (seeker/recruiter)
  - Forgot password OTP + Reset
  - Jobs: apply (localStorage), saved jobs
  - Applicants: list (from applications + demo)
  - Dashboard: role-based rich widgets (no empty)
  - Profile: edit + phone + skills + resume
  - Settings: account + contact + address + subscription + preferences + security
  - Dynamic header nav
*/

const K = {
  THEME: "cn-theme",
  CURRENT: "cn-current",
  USERS: "cn-users-index",       // list of emails for convenience
  APPS: "cn-applications",
  JOBS: "cn-jobs",
  MSGS: "cn-messages",
  COMP: "cn-companies",
  SAVED: "cn-saved-jobs",
  OTP: "cn-reset-otp",
  OTPUSER: "cn-reset-user",
  NOTIF: "cn-notif",
  SEED: "cn-seeded-v3"           // bump this on schema change
};

// Helpers
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const jget = (k, d=null)=>{ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } };
const jset = (k, v)=> localStorage.setItem(k, JSON.stringify(v));
const kUser = (email)=>`cn-user-${email}`;
const getUser = (email)=> jget(kUser(email));
const saveUser = (u)=> localStorage.setItem(kUser(u.email), JSON.stringify(u));
const setSession = (u)=> jset(K.CURRENT, u);
const currentUser = ()=> jget(K.CURRENT);
const clearSession = ()=> localStorage.removeItem(K.CURRENT);

// THEME + SHARE + NAV
function setupTheme(){
  const btn = $("#themeToggle");
  const saved = localStorage.getItem(K.THEME) || "light";
  if(saved==="dark") document.body.classList.add("dark");
  if(btn){
    btn.textContent = document.body.classList.contains("dark") ? "☀ Light" : "🌙 Dark";
    btn.addEventListener("click", ()=>{
      document.body.classList.toggle("dark");
      const dark = document.body.classList.contains("dark");
      localStorage.setItem(K.THEME, dark?"dark":"light");
      btn.textContent = dark ? "☀ Light" : "🌙 Dark";
    });
  }
}
function setupShare(){
  const b = $("#shareBtn"); if(!b) return;
  b.addEventListener("click", async()=>{
    const data={title:"ConfirmNokri",text:"A lightweight job portal demo",url:location.href};
    if(navigator.share) await navigator.share(data);
    else{ await navigator.clipboard.writeText(data.url); alert("Link copied: "+data.url); }
  });
}
function renderNav(){
  const nav = $("#navLinks"); if(!nav) return;
  const u = currentUser();
  if(u){
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="dashboard.html">Dashboard</a>
      <a href="jobs.html">Jobs</a>
      ${u.role==="recruiter" ? `<a href="applicants.html">Applicants</a>` : `<a href="inbox.html">Inbox</a>`}
      <a href="profile.html">My Profile</a>
      <a href="settings.html">Settings</a>
      <a href="#" id="logoutLink">Logout</a>
    `;
    $("#logoutLink")?.addEventListener("click",(e)=>{e.preventDefault();clearSession();alert("Logged out");location.href="index.html";});
  }else{
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="jobs.html">Jobs</a>
      <a href="login.html">Login</a>
      <a href="signup.html">Sign Up</a>
    `;
  }
}

// DEMO SEED DATA
function seedDemo(){
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
    role:"seeker", name:"Rohit Verma", email:"rohit@demo.com", password:"123456",
    phone:"+91 98765 12345", bio:"Frontend dev with 2y experience in React.",
    address:"Noida, UP", skills:"React, JavaScript, CSS, HTML", resume:"Rohit_Verma_Resume.pdf"
  };
  const demoRecruiter = {
    role:"recruiter", name:"Anita Sharma", email:"anita.hr@confirm.com", password:"123456",
    company:"ConfirmNokri HR", phone:"+91 98220 00011"
  };
  saveUser(demoSeeker); saveUser(demoRecruiter);

  jset(K.JOBS, jobs);
  jset(K.COMP, companies);
  jset(K.MSGS, messages);
  jset(K.APPS, [
    {title:"Frontend Developer", date:new Date().toLocaleString(), name:"Rohit Verma", email:"rohit@demo.com", resume:"Rohit_Verma_Resume.pdf"},
    {title:"Backend Engineer", date:new Date().toLocaleString(), name:"Priya Gupta", email:"priya@demo.com", resume:"Priya_Gupta.pdf"}
  ]);
  jset(K.SAVED, ["J104"]);

  // users index for lookup helper (optional)
  jset(K.USERS, ["rohit@demo.com","anita.hr@confirm.com"]);
  localStorage.setItem(K.SEED, "1");
}

// SIGNUP + TABS
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
    sf.addEventListener("submit",(e)=>{
      e.preventDefault();
      const name=sf.name.value.trim(), email=sf.email.value.trim(), password=sf.password.value;
      const phone=sf.phone?.value.trim()||"", bio=sf.bio?.value.trim()||"", address=sf.address?.value.trim()||"", skills=sf.skills?.value.trim()||"";
      const resume = sf.resume.files.length ? sf.resume.files[0].name : "Not uploaded";
      const u={role:"seeker", name,email,password,phone,bio,address,skills,resume};
      saveUser(u);
      alert("✅ Seeker account created"); location.href="login.html";
    });
  }
  if(rf){
    rf.addEventListener("submit",(e)=>{
      e.preventDefault();
      const name=rf.name.value.trim(), email=rf.email.value.trim(), password=rf.password.value, company=rf.company.value.trim(), phone=rf.phone?.value.trim()||"";
      const u={role:"recruiter", name,email,password,company,phone};
      saveUser(u);
      alert("✅ Recruiter account created"); location.href="login.html";
    });
  }
}

// LOGIN + FORGOT OTP
function setupLogin(){
  const f=$("#loginForm"); if(!f) return;
  f.addEventListener("submit",(e)=>{
    e.preventDefault();
    const email=f.querySelector('input[type="email"]').value.trim();
    const pass=f.querySelector('input[type="password"]').value;
    const u=getUser(email);
    if(u && u.password===pass){ setSession(u); alert("Welcome, "+u.name); location.href="dashboard.html"; }
    else alert("❌ Invalid credentials");
  });
  $("#forgotPassword")?.addEventListener("click",()=>{
    const input=prompt("Enter your registered Email:");
    if(!input) return;
    const u=getUser(input);
    if(!u){ alert("⚠ Account not found."); return; }
    const otp = Math.floor(100000+Math.random()*900000).toString();
    localStorage.setItem(K.OTP, otp); localStorage.setItem(K.OTPUSER, u.email);
    alert(`📩 OTP sent to ${u.email} (Demo OTP: ${otp})`);
    location.href="reset.html";
  });
}
function setupReset(){
  const f=$("#resetForm"); if(!f) return;
  f.addEventListener("submit",(e)=>{
    e.preventDefault();
    const otp=$("#resetOtp").value.trim(), np=$("#resetPass").value;
    const sOtp=localStorage.getItem(K.OTP), email=localStorage.getItem(K.OTPUSER);
    if(otp!==sOtp||!email) return alert("❌ Invalid/expired OTP");
    const u=getUser(email); if(!u) return alert("Account not found");
    u.password=np; saveUser(u); localStorage.removeItem(K.OTP); localStorage.removeItem(K.OTPUSER);
    alert("✅ Password updated"); location.href="login.html";
  });
}

// JOBS LIST + APPLY + SAVE + FILTER
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
        <button class="btn btn-primary apply-btn" data-id="${j.id}">Apply</button>
      </div>
    </div>`).join("");
  box.innerHTML = html;

  $$(".apply-btn", box).forEach(b=>{
    b.addEventListener("click",()=>{
      const jobId=b.dataset.id; const job=jget(K.JOBS,[]).find(x=>x.id===jobId);
      const u=currentUser(); if(!u || u.role!=="seeker"){ alert("Login as Job Seeker to apply."); location.href="login.html"; return; }
      const apps=jget(K.APPS,[]);
      apps.push({title:job.title,date:new Date().toLocaleString(),name:u.name,email:u.email,resume:u.resume||"Not uploaded"});
      jset(K.APPS, apps);
      alert("✅ Applied to: "+job.title);
    });
  });
  $$(".save-btn", box).forEach(b=>{
    b.addEventListener("click",()=>{
      const id=b.dataset.id;
      const saved=new Set(jget(K.SAVED,[]));
      if(saved.has(id)) saved.delete(id); else saved.add(id);
      jset(K.SAVED, Array.from(saved));
      renderJobs();
    });
  });

  // Simple search/filter demo
  $("#jobSearch")?.addEventListener("input",(e)=>{
    const q=e.target.value.toLowerCase();
    $$(".card", box).forEach(c=>{
      const txt=c.textContent.toLowerCase();
      c.style.display = txt.includes(q) ? "" : "none";
    });
  });
}

// APPLICANTS (Recruiter view) + Demo always
function showApplicants(){
  const list=$("#applicationsList"); if(!list) return;
  const apps=jget(K.APPS,[]);
  const demoExtra=[
    {title:"Data Analyst",date:"Aug 22, 11:03 AM",name:"Amit Singh",email:"amit@demo.com",resume:"Amit_Singh.pdf"},
    {title:"Product Manager",date:"Aug 21, 4:09 PM",name:"Neha Rao",email:"neha@demo.com",resume:"Neha_Rao.pdf"}
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
        <button class="btn">Message</button>
        <button class="btn btn-outline">Shortlist</button>
        <button class="btn btn-danger">Reject</button>
      </div>
    </div>
  `).join("");
}

// INBOX with demo always
function renderInbox(){
  const box=$("#inboxList"); if(!box) return;
  const msgs=jget(K.MSGS,[]);
  box.innerHTML = msgs.map(m=>`<div class="card"><p><strong>${m.from}:</strong> ${m.text}<br><small class="muted">${m.time}</small></p></div>`).join("");
}

// INDEX hero + trending + companies + testimonials
function renderHome(){
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

// PROFILE
function setupProfile(){
  const f=$("#profileForm"); if(!f) return;
  const u=currentUser(); if(!u){ alert("Please login"); location.href="login.html"; return; }
  f.name.value=u.name||""; f.email.value=u.email||""; f.phone.value=u.phone||""; f.address.value=u.address||""; f.skills.value=u.skills||""; f.bio.value=u.bio||"";
  const preview=$("#profilePreview");
  const render=(usr)=>{
    preview.innerHTML=`
      <h3>Preview</h3>
      <p><strong>${usr.name||"-"}</strong> · <span class="badge">${usr.email||"-"}</span><br/>
      <small>${usr.phone||"-"} · ${usr.address||"-"}</small></p>
      <p class="muted">${usr.bio||"No bio added."}</p>
      <p><small>Skills: ${usr.skills||"-"}</small></p>
      <p><small>Resume: ${usr.resume||"Not uploaded"}</small></p>
    `;
  };
  render(u);
  f.addEventListener("submit",(e)=>{
    e.preventDefault();
    u.name=f.name.value.trim(); u.email=f.email.value.trim(); u.phone=f.phone.value.trim(); u.address=f.address.value.trim(); u.skills=f.skills.value.trim(); u.bio=f.bio.value.trim();
    if(f.resume.files.length) u.resume=f.resume.files[0].name;
    saveUser(u); setSession(u); render(u); alert("✅ Profile updated");
  });
}

// DASHBOARD (rich - never empty)
function setupDashboard(){
  const box=$("#dashboardContent"); if(!box) return;
  const title=$("#dashTitle");
  const u=currentUser();
  if(!u){ title.textContent="Welcome"; box.innerHTML="<div class='card'>Please login to see your dashboard.</div>"; return; }
  title.textContent = u.role==="recruiter" ? "Recruiter Dashboard" : "Job Seeker Dashboard";

  const apps=jget(K.APPS,[]);
  const myApps = apps.filter(a=>a.email===u.email);
  const savedIds = new Set(jget(K.SAVED,[]));
  const jobs=jget(K.JOBS,[]);
  const saved = jobs.filter(j=>savedIds.has(j.id));

  if(u.role==="seeker"){
    const completion = Math.min(100, (["name","email","phone","skills","resume"].filter(k=>u[k]).length/5)*100).toFixed(0);
    box.innerHTML = `
      <div class="grid grid-2">
        <div class="card kpi"><span class="num">📝 ${myApps.length}</span><div>Applications</div></div>
        <div class="card kpi"><span class="num">⭐ ${saved.length}</span><div>Saved Jobs</div></div>
        <div class="card kpi"><span class="num">✨ ${completion}%</span><div>Profile Completion</div></div>
        <div class="card kpi"><span class="num">📨 ${jget(K.MSGS,[]).length}</span><div>Inbox</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:var(--gap)">
        <div class="card">
          <h3>Recent Applications</h3>
          ${(myApps.length? myApps.map(a=>`<div class="list-row"><div><strong>${a.title}</strong><div class="muted">${a.date}</div></div><span class="badge badge-ylw">Under Review</span></div>`).join("") : "<p class='muted'>No applications yet. Apply from Jobs.</p>")}
        </div>
        <div class="card">
          <h3>Saved Jobs</h3>
          ${(saved.length? saved.map(s=>`<div class="list-row"><div><strong>${s.title}</strong><div class="muted">${s.company} · ${s.location}</div></div><a class="btn btn-primary" href="jobs.html">Apply</a></div>`).join("") : "<p class='muted'>No saved jobs.</p>")}
        </div>
      </div>
    `;
  } else {
    const totalApplicants = apps.length;
    box.innerHTML = `
      <div class="grid grid-2">
        <div class="card kpi"><span class="num">💼 5</span><div>Active Job Posts</div></div>
        <div class="card kpi"><span class="num">📥 ${totalApplicants}</span><div>Total Applicants</div></div>
        <div class="card kpi"><span class="num">📈 72%</span><div>Job View → Apply</div></div>
        <div class="card kpi"><span class="num">💎 Pro</span><div>Subscription</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:var(--gap)">
        <div class="card">
          <h3>Latest Applicants</h3>
          ${apps.slice(-5).reverse().map(a=>`<div class="list-row"><div><strong>${a.name}</strong> <span class="badge">${a.email}</span><div class="muted">${a.title} · ${a.date}</div></div><div class="flex"><button class="btn">Message</button><button class="btn btn-outline">Shortlist</button></div></div>`).join("")}
          <div class="flex" style="margin-top:.8rem"><a class="btn btn-primary" href="applicants.html">View All</a></div>
        </div>
        <div class="card">
          <h3>Company Snapshot</h3>
          <p class="muted">${u.company||"Your Company"} · ${u.phone||"No phone"}</p>
          <ul>
            <li>Credits: 120</li>
            <li>Active recruiters: 3</li>
            <li>Pending interviews: 4</li>
          </ul>
          <div class="flex"><a class="btn btn-outline" href="settings.html">Manage Plan</a><a class="btn" href="jobs.html">Post Job</a></div>
        </div>
      </div>
    `;
  }
}

// SETTINGS (full)
function setupSettings(){
  // Preferences
  const autoDark=$("#autoDark"); if(autoDark){ const isDark=(localStorage.getItem(K.THEME)||"light")==="dark"; autoDark.checked=isDark; autoDark.addEventListener("change",()=>{const d=autoDark.checked; document.body.classList.toggle("dark",d); localStorage.setItem(K.THEME, d?"dark":"light"); const t=$("#themeToggle"); if(t) t.textContent=d?"☀ Light":"🌙 Dark";});}
  const notif=$("#toggleNotif"); if(notif){ notif.checked = localStorage.getItem(K.NOTIF)==="true"; notif.addEventListener("change",()=>localStorage.setItem(K.NOTIF, notif.checked)); }

  // Account + Contact + Address + Subscription
  const af=$("#accountForm"); if(af){
    const u=currentUser(); if(!u){ alert("Login required"); location.href="login.html"; return; }
    af.name.value=u.name||""; af.email.value=u.email||""; af.phone.value=u.phone||"";
    af.addEventListener("submit",(e)=>{e.preventDefault(); u.name=af.name.value.trim(); u.email=af.email.value.trim(); u.phone=af.phone.value.trim(); saveUser(u); setSession(u); alert("✅ Account saved");});
  }
  const addr=$("#addressForm"); if(addr){
    const u=currentUser(); addr.address.value=u?.address||""; addr.addEventListener("submit",(e)=>{e.preventDefault(); u.address=addr.address.value.trim(); saveUser(u); setSession(u); alert("✅ Address saved");});
  }
  const subs=$("#subscriptionForm"); if(subs){
    subs.addEventListener("submit",(e)=>{e.preventDefault(); alert("✅ Subscription preference saved");});
  }
  const pref=$("#prefForm"); if(pref){
    const u=currentUser()||{}; pref.skills.value=u.skills||""; pref.addEventListener("submit",(e)=>{e.preventDefault(); u.skills=pref.skills.value.trim(); saveUser(u); setSession(u); alert("✅ Preferences saved");});
  }
  const sec=$("#changePassForm"); if(sec){
    sec.addEventListener("submit",(e)=>{e.preventDefault(); const u=currentUser(); if(!u) return alert("Login required"); const cur=sec.curPass.value, nw=sec.newPass.value; const fresh=getUser(u.email); if(fresh?.password===cur){ fresh.password=nw; saveUser(fresh); setSession(fresh); sec.reset(); alert("✅ Password changed"); } else alert("❌ Current password incorrect");});
  }
  $("#deleteAccount")?.addEventListener("click",()=>{ if(!confirm("Delete your saved account?")) return; const u=currentUser(); if(!u) return; localStorage.removeItem(kUser(u.email)); clearSession(); alert("Account deleted."); location.href="index.html"; });
  $("#logoutBtn")?.addEventListener("click",()=>{ clearSession(); alert("Logged out"); location.href="index.html"; });
}

// INIT
document.addEventListener("DOMContentLoaded", ()=>{
  seedDemo();
  setupTheme(); setupShare(); renderNav();

  // Auth flows
  setupSignup(); setupLogin(); setupReset();

  // Pages
  renderHome(); renderJobs(); showApplicants(); renderInbox();
  setupProfile(); setupDashboard(); setupSettings();

  const y=$("#year"); if(y) y.textContent=new Date().getFullYear();
});
