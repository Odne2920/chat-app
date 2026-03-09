import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export function initHRNchat(customConfig = {}) {
    const C = {
        supabaseUrl: customConfig.supabaseUrl || "https://jnhsuniduzvhkpexorqk.supabase.co",
        supabaseKey: customConfig.supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHN1bmlkdXp2aGtwZXhvcnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjAxMDYsImV4cCI6MjA4NzEzNjEwNn0.9I5bbqskCgksUaNWYlFFo0-6Odht28pOMdxTGZECahY",
        mailApi: customConfig.mailApi || "https://vercel-serverless-hrn.vercel.app/api/mailAPI",
        maxUsers: customConfig.maxUsers || 150, maxMessages: customConfig.maxMessages || 50, historyLoadLimit: customConfig.historyLoadLimit || 20,
        rateLimitMs: customConfig.rateLimitMs || 1000, verificationCodeExpiry: customConfig.verificationCodeExpiry || 600, maxMessageLength: customConfig.maxMessageLength || 5000,
        requestTimeout: 3000, backgroundDisconnectMs: customConfig.backgroundDisconnectMs || 5000
    };
    const A = ['./assets/avatars/1.webp', './assets/avatars/2.webp', './assets/avatars/3.webp', './assets/avatars/4.webp', './assets/avatars/5.webp'];
    const S = {
        user: null, currentRoomId: null, currentRoomData: null, currentRoomDisplay: { name: null, avatar: null }, chatChannel: null, presenceChannel: null,
        globalPresenceChannel: null, allRooms: [], vTimer: null, lastRenderedDateLabel: null, lastKnownOnlineCount: null, globalOnlineCount: 0, sessionStartTime: null,
        isPresenceSubscribed: false, pending: null, lastCreated: null, lastCreatedPass: null, processingAction: false, isLoadingHistory: false, oldestMessageTimestamp: null,
        hasMoreHistory: true, lastMessageTime: 0, isChatChannelReady: false, selectedAllowedUsers: [], currentPickerContext: null, lastLobbyRefresh: 0, removePasswordFlag: false,
        longPressTimer: null, currentStep: { create: 1, edit: 1, reg: 1 }, selectedAvatar: null, createType: 'group', currentRoomPassword: null, reconnectTimer: null,
        deleteConfirmTimeout: null, profileCache: {}, profileCacheKeys: [], editingMessage: null, contextTarget: null, connectionStrength: '4g', globalPresenceReady: false,
        connectionTimeoutTimer: null, presenceUpdateTimer: null, isNavigating: false, isOfflineMode: false, isCapacityBlocked: false, authListener: null, internetCheckInterval: null,
        backgroundDisconnectTimer: null, isBackgroundDisconnectActive: false, isHardReconnecting: false, isConnecting: false, ui: { isOverlayOpen: false, isContextOpen: false, overlayCloseLocked: false }, dom: {}
    };
    let Tq = [], Tv = false, Tt = "", Ttime = 0;
    const $ = id => S.dom[id] || (S.dom[id] = document.getElementById(id));
    const esc = t => { const p = document.createElement('p'); p.textContent = t; return p.innerHTML; };
    const trunc = (t, m = 20) => !t ? "" : t.length > m ? t.substring(0, m) + "..." : t;
    const getTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const safeAwait = p => p.then(d => [d, null]).catch(e => [null, e]);
    const execQ = p => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), C.requestTimeout))]);
    
    const L = {
        db: null,
        init() {
            return new Promise((res, rej) => {
                const r = indexedDB.open('HRN_LOCAL_DB_7', 1);
                r.onerror = () => rej(r.error);
                r.onsuccess = () => { this.db = r.result; res(); };
                r.onupgradeneeded = e => {
                    const d = e.target.result;
                    ['rooms', 'profiles', 'keys', 'known_users', 'user_tree'].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: 'id' }); });
                    if (!d.objectStoreNames.contains('messages')) {
                        const m = d.createObjectStore('messages', { keyPath: 'id' });
                        m.createIndex('room_id', 'room_id', { unique: false });
                    }
                };
            });
        },
        req: (s, m, k, v) => new Promise((res, rej) => {
            if (!L.db) return rej("DB init fail");
            const t = L.db.transaction(s, m);
            const os = t.objectStore(s);
            const req = k ? (m === 'readonly' ? os.get(k) : (v ? os.put(v) : os.delete(k))) : os.getAll();
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        }),
        get: (s, k) => L.req(s, 'readonly', k),
        getAll: s => L.req(s, 'readonly').catch(() => []),
        put: (s, v) => L.req(s, 'readwrite', v.id, v),
        putAll: (s, arr) => new Promise((res, rej) => {
            if (!arr || !arr.length) return res();
            const t = L.db.transaction(s, 'readwrite');
            const os = t.objectStore(s);
            arr.forEach(v => v && v.id && os.put(v));
            t.oncomplete = res;
            t.onerror = () => rej(t.error);
        }),
        delete: (s, k) => L.req(s, 'readwrite', k),
        clear: s => new Promise(res => { const t = L.db.transaction(s, 'readwrite'); t.objectStore(s).clear(); t.oncomplete = res; }),
        getRoomMsgs: async rid => (await L.getAll('messages')).filter(m => m.room_id === rid).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
        clearRoomMsgs: rid => new Promise((res, rej) => {
            if (!L.db) return rej();
            const t = L.db.transaction('messages', 'readwrite');
            const req = t.objectStore('messages').index('room_id').openCursor(IDBKeyRange.only(rid));
            req.onsuccess = e => { const c = e.target.result; if (c) { c.delete(); c.continue(); } };
            t.oncomplete = res;
        }),
        saveUserTree: (uid, rms) => L.put('user_tree', { user_id: uid, room_ids: rms.map(r => r.id), timestamp: Date.now() }),
        getUserTree: uid => L.get('user_tree', uid)
    };

    const db = createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false, autoRefreshToken: true }, realtime: { params: { eventsPerSecond: 10 } } });
    
    const setMode = offline => { S.isOfflineMode = offline; updPresenceUI(); updSendBtn(); setConnVis(offline ? 'offline' : 'connected'); };
    const setConnVis = st => {
        const av = $('chat-avatar-display'); if (!av) return;
        av.classList.remove('status-connected', 'status-connecting', 'status-offline');
        av.classList.add(st === 'connected' ? 'status-connected' : (st === 'connecting' ? 'status-connecting' : 'status-offline'));
        updSendBtn();
    };
    const updSendBtn = () => {
        const b = $('send-btn'), i = $('chat-input'); if (!b || !i) return;
        const dis = S.isOfflineMode || !S.isChatChannelReady || S.isCapacityBlocked;
        b.disabled = dis; b.style.opacity = dis ? "0.5" : "1"; i.disabled = dis;
        i.placeholder = S.isOfflineMode ? "Offline." : (dis ? "Connecting..." : "Message...");
    };
    const schedPresUpd = () => { if (S.presenceUpdateTimer) clearTimeout(S.presenceUpdateTimer); S.presenceUpdateTimer = setTimeout(() => { updPresenceUI(); S.presenceUpdateTimer = null; }, 500); };
    const updPresenceUI = () => {
        const rc = $('room-user-count'), ir = $('info-room-count'), ig = $('info-global-count');
        let col = 'var(--text-mute)';
        if (S.isOfflineMode) { if (ig) ig.innerText = "Local"; if (rc) rc.innerText = "-"; if (ir) ir.innerText = "-"; }
        else {
            let cnt = S.lastKnownOnlineCount || 0, txt = cnt;
            if (S.currentRoomData?.is_direct) { if (cnt === 1) { txt = "Offline"; col = 'var(--text-mute)'; } else if (cnt === 2) { txt = "Online"; col = 'var(--success)'; } else { txt = "-"; col = 'var(--text-mute)'; } }
            else col = 'var(--success)';
            if (ig) ig.innerText = `${S.globalOnlineCount}/${C.maxUsers}`; if (rc) rc.innerText = txt; if (ir) ir.innerText = txt;
        }
        const dot = rc?.previousElementSibling; if (dot && dot.classList.contains('online-dot')) dot.style.background = col;
    };
    
    const processToast = () => {
        if (Tv || !Tq.length) return;
        const msg = Tq[0], now = Date.now();
        if (msg === Tt && (now - Ttime < 3000)) { Tq.shift(); if (Tq.length > 0) processToast(); return; }
        Tv = true; const cMsg = Tq.shift(); Tt = cMsg; Ttime = now;
        const c = $('toast-container'), t = document.createElement('div'); t.className = 'toast-item'; t.innerText = cMsg;
        t.onclick = () => { if(Date.now() - Ttime < 300) return; t.style.opacity = '0'; setTimeout(() => { t.remove(); Tv = false; processToast(); }, 400); };
        c.appendChild(t);
        setTimeout(() => { if (t.parentNode) { t.style.opacity = '0'; setTimeout(() => { t.remove(); Tv = false; processToast(); }, 400); } }, 3000);
    };
    window.toast = m => { if (m === Tt && (Date.now() - Ttime < 2000)) return; Tq.push(m); processToast(); };
    window.setLoading = (s, t = null) => { const l = $('loader-overlay'), lt = $('loader-text'); if (!l) return; l.classList.toggle('active', s); if (lt) lt.innerText = t || "Loading..."; };

    const cacheAv = async p => { if (!p) return p; await L.put('profiles', p); if (!S.profileCache[p.id]) S.profileCacheKeys.push(p.id); S.profileCache[p.id] = p; if (S.profileCacheKeys.length > 100) delete S.profileCache[S.profileCacheKeys.shift()]; return p; };
    const getProf = async uid => {
        if (!uid) return null; if (S.profileCache[uid]) return S.profileCache[uid];
        let p = await L.get('profiles', uid);
        if (!S.isOfflineMode) { try { const { data: sP } = await db.from('profiles').select('id, full_name, avatar_url, updated_at').eq('id', uid).single(); if (sP) { const lT = p?.updated_at ? new Date(p.updated_at).getTime() : 0, sT = sP.updated_at ? new Date(sP.updated_at).getTime() : 0; if (!p || sT > lT || !p.full_name) { p = sP; await cacheAv(p); } } } catch (e) { } }
        if (p) S.profileCache[uid] = p; return p;
    };
    const getProfs = async uids => {
        if (!uids || !uids.length) return []; const uniq = [...new Set(uids)], miss = uniq.filter(id => !S.profileCache[id]);
        if (miss.length && !S.isOfflineMode) { try { const { data: pArr } = await db.from('profiles').select('id, full_name, avatar_url, updated_at').in('id', miss); if (pArr) await Promise.all(pArr.map(p => cacheAv(p))); } catch (e) { } }
        return uniq.map(id => S.profileCache[id]).filter(Boolean);
    };
    const resolveDisp = async r => {
        if (!r) return { name: 'Chat', avatar: null }; if (!r.is_direct) return { name: r.name, avatar: r.avatar_url || null };
        const myId = S.user?.id; if (!myId || !r.allowed_users?.length) return { name: 'Direct Message', avatar: null };
        const oId = r.allowed_users.find(id => id !== myId && id !== '*'); if (!oId) return { name: 'Direct Message', avatar: null };
        const p = await getProf(oId); return p ? { name: p.full_name || 'User', avatar: p.avatar_url || null } : { name: 'Unknown User', avatar: null };
    };
    const updGateUI = async r => { if (!r) return; const d = await resolveDisp(r); if ($('gate-room-name')) $('gate-room-name').innerText = d.name; if ($('gate-room-avatar')) d.avatar ? $('gate-room-avatar').innerHTML = `<img src="${d.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : $('gate-room-avatar').innerHTML = `<span style="font-size:24px;font-weight:700;color:var(--accent)">${d.name.charAt(0)}</span>`; };

    const workerCode = `self.onmessage=async e=>{let{id:i,type:t,payload:p}=e.data,E=new TextEncoder(),D=new TextDecoder();self.keys=self.keys||{};try{if(t==='deriveKey'){let k=await crypto.subtle.importKey('raw',E.encode(p.password),{name:'PBKDF2'},false,['deriveKey']);self.keys[p.keyId]=await crypto.subtle.deriveKey({name:'PBKDF2',salt:E.encode(p.salt),iterations:3e5,hash:'SHA-256'},k,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);self.postMessage({id:i,type:'keyDerived',success:1})}else if(t==='encrypt'){if(!self.keys[p.keyId])throw new Error("Key missing");let iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},self.keys[p.keyId],E.encode(p.text)),cmb=new Uint8Array(iv.length+ct.byteLength);cmb.set(iv,0);cmb.set(new Uint8Array(ct),iv.length);self.postMessage({id:i,type:'encrypted',result:btoa(String.fromCharCode(...cmb))})}else if(t==='decryptHistory'||t==='decryptSingle'){if(!self.keys[p.keyId])throw new Error("Key missing");let msgs=t==='decryptHistory'?p.messages:[p],res=[];for(let m of msgs){try{if(m.content==='/'){res.push({id:m.id,deleted:true,user_id:m.user_id,user_name:m.user_name,created_at:m.created_at,updated_at:m.updated_at});continue}let bin=atob(m.content),bytes=new Uint8Array(bin.length);for(let j=0;j<bin.length;j++)bytes[j]=bin.charCodeAt(j);let iv=bytes.slice(0,12),ct=bytes.slice(12),dec=await crypto.subtle.decrypt({name:'AES-GCM',iv},self.keys[p.keyId],ct),txt=D.decode(dec),pts=txt.split('|');res.push({id:m.id,time:pts[0],text:pts.slice(1).join('|'),user_id:m.user_id,user_name:m.user_name,created_at:m.created_at,updated_at:m.updated_at})}catch(err){res.push({id:m.id,error:true})}}self.postMessage({id:i,type:t==='decryptHistory'?'historyDecrypted':'singleDecrypted',results:res,result:res[0]})}}catch(err){self.postMessage({id:i,type:'error',message:err.message})}}`;
    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const cryptW = new Worker(URL.createObjectURL(workerBlob));
    const pendingR = {};
    
    cryptW.onmessage = e => {
        const { id, type, result, error, results, success } = e.data;
        const k = id || type;
        if (pendingR[k]) {
            if (error) pendingR[k].reject(error);
            else pendingR[k].resolve({ type, result, results, success });
            delete pendingR[k];
        }
    };
    
    const wExec = (type, payload) => new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        pendingR[id] = { resolve, reject };
        cryptW.postMessage({ id, type, payload });
    });
    
    const genSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    const sha256 = async t => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('');
    const deriveKey = (pass, salt, keyId) => wExec('deriveKey', { password: pass, salt: salt, keyId: keyId });
    const encMsg = async (text, keyId) => { const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); const r = await wExec('encrypt', { text: t + "|" + text, keyId: keyId }); return r.result; };

    const getConnT = () => { const c = navigator.connection; const t = c?.effectiveType; if (t === '4g') return 5000; if (t === '3g') return 10000; if (t === '2g') return 20000; return 8000; };
    const handleFull = async () => { if (S.isCapacityBlocked) return; S.isCapacityBlocked = true; await fullDisc(); const o = $('block-overlay'); if (o) { o.innerHTML = `<i data-lucide="users" style="width:48px;height:48px;margin-bottom:24px;color:var(--warning)"></i><h1 style="margin-bottom: 20px" class="title">Server Full</h1><p class="subtitle" style="text-align:center">Max concurrent user count (${C.maxUsers}) reached.<br>Please try again later.</p>`; o.classList.add('active'); } };
    const cleanChans = async (keepG = false) => {
        if (S.connectionTimeoutTimer) clearTimeout(S.connectionTimeoutTimer); S.connectionTimeoutTimer = null;
        if (S.reconnectTimer) clearTimeout(S.reconnectTimer); S.reconnectTimer = null;
        if (S.presenceChannel) { try { S.presenceChannel.unsubscribe(); } catch (e) { } S.presenceChannel = null; S.isPresenceSubscribed = false; }
        if (S.chatChannel) { try { S.chatChannel.unsubscribe(); } catch (e) { } S.chatChannel = null; }
        if (!keepG && S.globalPresenceChannel) { try { S.globalPresenceChannel.unsubscribe(); } catch (e) { } S.globalPresenceChannel = null; S.globalPresenceReady = false; }
        S.isChatChannelReady = false; updSendBtn();
    };
    const fullDisc = async () => { await cleanChans(false); };
    const queryPres = async () => { if (!S.presenceChannel) return; const st = S.presenceChannel.presenceState(); S.lastKnownOnlineCount = new Set(Object.values(st).flat().map(p => p.user_id)).size; schedPresUpd(); };
    const trackPres = async (ch, uid) => { if (!ch || !uid) return; try { await ch.track({ user_id: uid, online_at: new Date().toISOString() }); } catch (e) { } };
    const setupGlobPres = async uid => {
        if (S.isOfflineMode || S.isCapacityBlocked) return;
        if (S.globalPresenceChannel) { try { S.globalPresenceChannel.unsubscribe(); } catch (e) { } S.globalPresenceChannel = null; }
        S.globalPresenceChannel = db.channel('global-presence', { config: { presence: { key: uid || `l_${Date.now()}` } } });
        S.globalPresenceChannel.on('presence', { event: 'sync' }, async () => {
            if (!S.globalPresenceChannel) return; const st = S.globalPresenceChannel.presenceState(); const uids = new Set(); Object.values(st).flat().forEach(p => uids.add(p.user_id)); S.globalOnlineCount = uids.size; S.globalPresenceReady = true; schedPresUpd();
            if (S.user && !S.isOfflineMode && !S.isCapacityBlocked && S.globalOnlineCount > C.maxUsers && !uids.has(S.user.id)) handleFull();
        }).subscribe(async st => { if (st === 'SUBSCRIBED' && uid) await trackPres(S.globalPresenceChannel, uid); });
    };
    
    const hardRefMsgs = async rid => {
        if (!rid || !S.currentRoomData) return; const cont = $('chat-messages'); let msgs = [];
        try {
            const { data, error } = await execQ(db.from('messages').select('*').eq('room_id', rid).order('created_at', { ascending: false }).limit(C.maxMessages));
            if (error) throw error;
            if (data) { data.reverse(); const r = await wExec('decryptHistory', { messages: data, keyId: rid }); msgs = r.results.filter(m => !m.error); await L.clearRoomMsgs(rid); await L.putAll('messages', msgs.map(m => ({ ...m, room_id: rid }))); }
        } catch (e) { return; }
        cont.innerHTML = ''; S.lastRenderedDateLabel = null;
        if (msgs.length) { S.oldestMessageTimestamp = msgs[0].created_at; let h = '', p = null; msgs.forEach(m => { h += renderM(m, p, S.currentRoomData?.is_direct); p = m; }); cont.innerHTML = h; }
        cont.scrollTop = cont.scrollHeight;
    };
    const attemptHardReconn = () => {
        if (!S.currentRoomId || document.hidden || !S.user || S.isOfflineMode || S.isCapacityBlocked || S.isHardReconnecting || S.isConnecting) return;
        S.isHardReconnecting = true; cleanChans(true); setConnVis('connecting');
        if (S.connectionTimeoutTimer) clearTimeout(S.connectionTimeoutTimer);
        S.connectionTimeoutTimer = setTimeout(() => { S.isHardReconnecting = false; attemptHardReconn(); }, getConnT());
        try { db.realtime?.connect(); } catch (e) { }
        initRoomPres(S.currentRoomId); setupChatChan(S.currentRoomId);
    };
    const attemptLogin = async (email, pass) => {
        try { const { error } = await execQ(db.auth.signInWithPassword({ email, password: pass })); if (error) throw error; } catch (e) { return false; }
        const { data: { user } } = await db.auth.getUser(); S.user = user;
        if (user) { const pD = { id: user.id, full_name: user.user_metadata?.full_name, avatar_url: user.user_metadata?.avatar_url, updated_at: new Date().toISOString() }; await cacheAv(pD); }
        const hashIn = await sha256(pass + email); await L.put('known_users', { id: email, pass_hash: hashIn, email: email, metadata: user.user_metadata, userId: user.id });
        return true;
    };
    
    window.goOnline = async () => {
        if (S.isConnecting || S.isHardReconnecting) return; S.isConnecting = true; stopNetChk(); S.isCapacityBlocked = false;
        const o = $('block-overlay'); if (o) o.classList.remove('active');
        try { db.realtime?.connect(); } catch (e) { }
        if (S.user) { const sE = localStorage.getItem('hrn_auth_email'), sP = localStorage.getItem('hrn_auth_pass'); if (sE && sP && await attemptLogin(sE, sP)) { setMode(false); setupGlobPres(S.user.id); S.isConnecting = false; if (S.currentRoomId) attemptHardReconn(); window.loadRooms(); window.toast("Connected."); } else { setMode(true); S.isConnecting = false; } return; }
        const actScr = document.querySelector('.screen.active'); const isAuth = ['scr-login', 'scr-register', 'scr-start', 'scr-verify'].includes(actScr?.id);
        if (isAuth) { setMode(false); window.setLoading(true, "Connecting..."); }
        const sE = localStorage.getItem('hrn_auth_email'), sP = localStorage.getItem('hrn_auth_pass');
        if (sE && sP) { const succ = await attemptLogin(sE, sP); if (succ) { setMode(false); setupGlobPres(S.user.id); S.isConnecting = false; window.nav('scr-lobby'); window.loadRooms(); window.toast("Connected."); } else { window.toast("Connection failed."); S.isConnecting = false; } if (isAuth) window.setLoading(false); }
        else { if (isAuth) window.setLoading(false); else { window.toast("No saved login."); setMode(true); } S.isConnecting = false; }
    };
    window.stayOffline = async () => { const o = $('block-overlay'); if (o) o.classList.remove('active'); await fullDisc(); setMode(true); window.toast("Offline mode."); if (S.user) window.loadRooms(); };

    const setupChatChan = id => {
        if (S.isOfflineMode) return; if (S.chatChannel) S.chatChannel.unsubscribe();
        const isDir = S.currentRoomData?.is_direct;
        S.chatChannel = db.channel(`room_chat_${id}`, { config: { broadcast: { self: true } } });
        S.chatChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, async p => {
            const m = p.new; if (m && S.currentRoomId) { try { const dR = await wExec('decryptSingle', { content: m.content, keyId: id }); if (dR.result) { const mO = { ...m, ...dR.result, room_id: m.room_id }; const c = $('chat-messages'), lM = c.querySelector('.msg:last-of-type'); let pD = null; if (lM) pD = { user_id: lM.dataset.uid, created_at: lM.dataset.time }; c.insertAdjacentHTML('beforeend', renderM(mO, pD, isDir)); c.scrollTop = c.scrollHeight; chkEmpty(); await L.put('messages', mO); } } catch (e) { } }
        }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, async p => {
            const m = p.new, el = document.querySelector(`.msg[data-id="${m.id}"]`); if (el) { try { const dR = await wExec('decryptSingle', { content: m.content, keyId: id }); const del = m.content === '/'; if (del) { el.classList.add('msg-deleted'); const d = el.querySelector('div:not(.msg-header)'); if (d) { d.className = 'deleted-text'; d.innerText = "Message deleted"; } const tS = el.querySelector('.msg-time'); if (tS) { const eT = tS.querySelector('.edited-tag'); if (eT) eT.remove(); } el.dataset.text = ""; } else if (dR.result) { const pE = el.previousElementSibling; let pD = null; if (pE?.classList.contains('msg')) pD = { user_id: pE.dataset.uid, created_at: pE.dataset.time }; el.outerHTML = renderM({ ...m, ...dR.result, room_id: m.room_id, updated_at: m.updated_at }, pD, isDir); } const c = await L.get('messages', m.id); if (c) { c.deleted = del; c.text = dR.result?.text; await L.put('messages', c); } } catch (e) { } }
        }).subscribe(st => {
            const wasR = S.isChatChannelReady; S.isChatChannelReady = st === 'SUBSCRIBED';
            if (st === 'SUBSCRIBED') { if (S.connectionTimeoutTimer) clearTimeout(S.connectionTimeoutTimer); S.connectionTimeoutTimer = null; S.isHardReconnecting = false; if (S.reconnectTimer) clearTimeout(S.reconnectTimer); setConnVis('connected'); hardRefMsgs(id); }
            else if (['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(st)) { if (S.connectionTimeoutTimer) clearTimeout(S.connectionTimeoutTimer); S.connectionTimeoutTimer = null; if (!S.isOfflineMode && !S.isCapacityBlocked && !S.isBackgroundDisconnectActive && !document.hidden && S.currentRoomId) { S.isChatChannelReady = false; if (!S.isHardReconnecting) { S.isHardReconnecting = true; setConnVis('connecting'); S.reconnectTimer = setTimeout(attemptHardReconn, 2000); } } }
            if (wasR !== S.isChatChannelReady) updSendBtn();
        });
    };
    const initRoomPres = async rid => {
        if (!S.user || S.isOfflineMode) return; if (S.presenceChannel) S.presenceChannel.unsubscribe();
        const myId = S.user.id;
        S.presenceChannel = db.channel(`room_presence:${rid}`, { config: { presence: { key: myId } } });
        S.presenceChannel.on('presence', { event: 'sync' }, () => { if (!S.presenceChannel) return; queryPres(); }).subscribe(async st => {
            if (st === 'SUBSCRIBED') { if (!S.presenceChannel) return; S.isPresenceSubscribed = true; S.isHardReconnecting = false; queryPres(); await trackPres(S.presenceChannel, myId); queryPres(); }
            else if (['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(st)) { S.isPresenceSubscribed = false; if (!S.isOfflineMode && !S.isCapacityBlocked && !S.isBackgroundDisconnectActive && !document.hidden && S.currentRoomId) { S.isHardReconnecting = true; setConnVis('connecting'); S.reconnectTimer = setTimeout(attemptHardReconn, 2000); } }
        });
    };
    const startNetChk = () => { if (S.internetCheckInterval) return; S.internetCheckInterval = setInterval(async () => { try { const r = await fetch('./assets/internet-test-file.txt', { cache: 'no-store' }); if (r.ok) { stopNetChk(); if (S.isOfflineMode) window.goOnline(); } } catch (e) { } }, 5000); };
    const stopNetChk = () => { if (S.internetCheckInterval) { clearInterval(S.internetCheckInterval); S.internetCheckInterval = null; } };
    const monitorConn = () => {
        const onOn = () => { stopNetChk(); if (S.isOfflineMode) window.goOnline(); else { setConnVis('connecting'); db.realtime?.connect(); if (S.currentRoomId) attemptHardReconn(); else setConnVis('connected'); } };
        const onOff = async () => { setMode(true); if (S.connectionTimeoutTimer) clearTimeout(S.connectionTimeoutTimer); if (S.reconnectTimer) clearTimeout(S.reconnectTimer); S.isHardReconnecting = S.isConnecting = S.globalPresenceReady = false; cleanChans(false); startNetChk(); };
        window.addEventListener('online', onOn); window.addEventListener('offline', onOff);
        document.addEventListener('visibilitychange', async () => {
            if (S.isCapacityBlocked) return;
            if (document.visibilityState === 'hidden') { if (S.reconnectTimer) clearTimeout(S.reconnectTimer); S.reconnectTimer = null; if (S.backgroundDisconnectTimer) clearTimeout(S.backgroundDisconnectTimer); S.backgroundDisconnectTimer = setTimeout(async () => { if (!S.isOfflineMode && !S.isCapacityBlocked) { await fullDisc(); S.isBackgroundDisconnectActive = true; } }, C.backgroundDisconnectMs); }
            else if (document.visibilityState === 'visible') { if (S.backgroundDisconnectTimer) clearTimeout(S.backgroundDisconnectTimer); S.backgroundDisconnectTimer = null; if (S.isBackgroundDisconnectActive) { S.isBackgroundDisconnectActive = false; if (S.user && !S.isOfflineMode) { db.realtime?.connect(); setupGlobPres(S.user.id); if (S.currentRoomId) attemptHardReconn(); } } else if (!S.isChatChannelReady && S.currentRoomId) attemptHardReconn(); else if (navigator.onLine && !S.globalPresenceReady) window.goOnline(); if (S.presenceChannel && S.user) await trackPres(S.presenceChannel, S.user.id); if (S.globalPresenceChannel && S.user) await trackPres(S.globalPresenceChannel, S.user.id); }
        });
        window.addEventListener('beforeunload', async () => { await fullDisc(); });
    };
    
    const showCtx = (e, el) => {
        if (!el || !S.user || el.classList.contains('msg-deleted')) return; e.preventDefault(); e.stopPropagation();
        const d = { id: el.dataset.id, user_id: el.dataset.uid, created_at: el.dataset.time, text: el.dataset.text };
        const m = $('context-menu'), ed = $('ctx-edit'), del = $('ctx-delete'), cp = $('ctx-copy');
        const isOwn = d.user_id === S.user.id, minAgo = (new Date() - new Date(d.created_at)) / 60000;
        ed.style.display = (isOwn && minAgo < 15) ? 'flex' : 'none'; del.style.display = isOwn ? 'flex' : 'none'; cp.style.display = 'flex';
        S.contextTarget = d; let x = e.clientX || e.touches?.[0]?.clientX, y = e.clientY || e.touches?.[0]?.clientY;
        m.style.left = `${x}px`; m.style.top = `${y}px`;
        setTimeout(() => { const r = m.getBoundingClientRect(); if (r.right > innerWidth) m.style.left = `${innerWidth - r.width - 10}px`; if (r.bottom > innerHeight) m.style.top = `${innerHeight - r.height - 10}px`; m.classList.add('active'); S.ui.isContextOpen = true; }, 10);
    };
    const hideCtx = () => { const m = $('context-menu'); if (m) m.classList.remove('active'); S.contextTarget = null; S.ui.isContextOpen = false; };
    $('ctx-edit').onclick = e => { e.stopPropagation(); if (!S.contextTarget) return; S.editingMessage = S.contextTarget; $('edit-msg-input').value = S.contextTarget.text; window.showOverlayView('edit-message'); window.openOverlay(); hideCtx(); };
    $('ctx-copy').onclick = e => { e.stopPropagation(); if (!S.contextTarget) return; navigator.clipboard.writeText(S.contextTarget.text); window.toast("Copied."); hideCtx(); };
    $('ctx-delete').onclick = async e => { e.stopPropagation(); if (!S.contextTarget || !S.user) return; hideCtx(); window.setLoading(true, "Deleting..."); const { error } = await db.from('messages').update({ content: '/' }).eq('id', S.contextTarget.id); if (error) window.toast("Failed."); window.setLoading(false); };
    window.saveEditMsg = async () => {
        if (!S.editingMessage) return; const v = $('edit-msg-input').value.trim(); if (!v) return window.toast("Empty.");
        const minAgo = (new Date() - new Date(S.editingMessage.created_at)) / 60000;
        if (minAgo >= 15) { window.toast("Expired."); window.closeOverlay(); S.editingMessage = null; return; }
        window.setLoading(true, "Saving...");
        try { const enc = await encMsg(v, S.currentRoomId); const { error } = await db.from('messages').update({ content: enc }).eq('id', S.editingMessage.id); if (error) window.toast("Failed."); else window.toast("Updated."); } catch (e) { window.toast("Error."); }
        S.editingMessage = null; window.setLoading(false); window.closeOverlay();
    };
    document.addEventListener('click', e => {
        if (S.ui.isContextOpen) { const m = $('context-menu'); if (m && !m.contains(e.target)) hideCtx(); }
        if (S.ui.isOverlayOpen && !S.ui.overlayCloseLocked) { const o = $('overlay-container'); if (o && e.target === o) window.closeOverlay(); }
    });
    const chatCont = $('chat-messages');
    chatCont.addEventListener('touchstart', e => { const m = e.target.closest('.msg'); if (!m) return; S.longPressTimer = setTimeout(() => showCtx(e, m), 500); }, { passive: true });
    chatCont.addEventListener('touchend', () => clearTimeout(S.longPressTimer)); chatCont.addEventListener('touchmove', () => clearTimeout(S.longPressTimer));
    chatCont.addEventListener('contextmenu', e => { const m = e.target.closest('.msg'); if (m) { e.preventDefault(); showCtx(e, m); } });

    const updAccSum = p => { const s = $(`${p}-access-summary`); if (!s) return; const c = S.selectedAllowedUsers.length; s.innerHTML = `<span class="c-main">${c === 0 ? "Public Room" : `${c} User${c > 1 ? 's' : ''}`}</span><i data-lucide="chevron-right" class="w-16 h-16"></i>`; };
    const updStepUI = ctx => {
        const c = S.currentStep[ctx], ind = $(`${ctx}-step-indicator`); if (!ind) return;
        ind.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i < c));
        if (ctx === 'reg') { $('reg-step-1').classList.toggle('active', c === 1); $('reg-step-2').classList.toggle('active', c === 2); $('reg-step-3').classList.toggle('active', c === 3); if (c === 3) initAvCar(); }
        else { $(`${ctx}-step-1`).classList.toggle('active', c === 1); $(`${ctx}-step-2`).classList.toggle('active', c === 2); }
    };
    const initAvCar = () => { if (!S.selectedAvatar) S.selectedAvatar = A[0]; updCarPrev(); };
    const updCarPrev = () => { const p = $('avatar-preview-el'); if (S.selectedAvatar) p.innerHTML = `<img src="${S.selectedAvatar}">`; };
    window.carouselNav = dir => { let i = A.indexOf(S.selectedAvatar); if (i === -1) i = 0; i += dir; if (i < 0) i = A.length - 1; if (i >= A.length) i = 0; S.selectedAvatar = A[i]; $('r-avatar-url').value = ''; updCarPrev(); };
    window.handleAvatarUpload = evt => {
        const f = evt.target.files[0]; if (f) { const r = new FileReader(); r.onload = e => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'), sz = 200; c.width = c.height = sz; const x = c.getContext('2d'); const sc = Math.max(sz / i.width, sz / i.height); x.drawImage(i, (sz - i.width * sc) / 2, (sz - i.height * sc) / 2, i.width * sc, i.height * sc); const d = c.toDataURL('image/jpeg', 0.85); S.selectedAvatar = d; A.push(d); $('r-avatar-url').value = ''; updCarPrev(); window.toast("Uploaded."); }; i.onerror = () => window.toast("Invalid."); i.src = e.target.result; }; r.readAsDataURL(f); }
    };
    window.selectCreateType = t => { S.createType = t; document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected')); $(`type-${t}`).classList.add('selected'); };
    window.nextRegStep = () => { if (S.currentStep.reg === 1) { const em = $('r-email').value, p = $('r-pass').value; if (!em || p.length < 8) return window.toast("Invalid."); } if (S.currentStep.reg === 2) { const n = $('r-name').value; if (!n) return window.toast("Name required."); } S.currentStep.reg++; updStepUI('reg'); };
    window.prevRegStep = () => { S.currentStep.reg--; updStepUI('reg'); };
    window.nextCreateStep = () => {
        S.currentStep.create = 2; updStepUI('create');
        const gF = $('create-group-fields'), dF = $('create-direct-fields'), aS = $('create-access-summary'), tE = $('create-step2-title'), sE = $('create-step2-sub');
        if (!gF || !dF || !aS || !tE || !sE) return;
        if (S.createType === 'direct') { gF.classList.add('dn'); dF.classList.remove('dn'); aS.classList.add('dn'); tE.innerText = "Direct Message"; sE.innerText = "Who are you messaging?"; }
        else { gF.classList.remove('dn'); dF.classList.add('dn'); aS.classList.remove('dn'); tE.innerText = "Setup"; sE.innerText = "Details"; }
        updAccSum('create');
    };
    window.prevCreateStep = () => { S.currentStep.create = 1; updStepUI('create'); };
    window.nextEditStep = () => { const n = $('edit-room-name').value.trim(); if (!n) return window.toast("Name required."); S.currentStep.edit = 2; updStepUI('edit'); updAccSum('edit'); };
    window.prevEditStep = () => { S.currentStep.edit = 1; updStepUI('edit'); };

    window.openAccessManager = async pre => {
        S.currentPickerContext = pre;
        if (pre === 'edit-room' && !S.selectedAllowedUsers.length && S.currentRoomData) { const ids = S.currentRoomData.allowed_users; if (ids && !ids.includes('*')) { const { data: pArr } = await db.from('profiles').select('id, full_name, avatar_url').in('id', ids); S.selectedAllowedUsers = ids.map(id => { const p = pArr?.find(x => x.id === id); return { id, name: p?.full_name || 'Unknown', avatar: p?.avatar_url }; }); } }
        rendPickSel(); window.showOverlayView('access-manager'); window.openOverlay(); S.ui.overlayCloseLocked = true; $('picker-id-input').value = ''; $('picker-id-input').focus();
    };
    window.closeAccessManager = () => { S.ui.overlayCloseLocked = false; window.showOverlayView(S.currentPickerContext === 'edit-room' ? 'room-settings' : 'create-step2-panel'); window.closeOverlay(); updAccSum(S.currentPickerContext); };
    const rendPickSel = () => {
        const c = $('picker-selected-list'), u = S.selectedAllowedUsers;
        if (!u.length) { c.innerHTML = `<div style="color:var(--text-mute);padding:20px 0;font-size:12px;text-align:center">No users selected.</div>`; $('picker-count').innerText = '0'; return; }
        $('picker-count').innerText = u.length;
        c.innerHTML = u.map(u => `<div class="picker-user-card" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><div style="width:28px;height:28px;border-radius:50%;background:#f2f2f7;overflow:hidden;margin-right:8px;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:800;font-size:11px">${u.avatar ? `<img src="${u.avatar}">` : u.name.charAt(0)}</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:12px">${esc(u.name)} ${u.id === S.user.id ? '<span style="color:var(--text-mute);font-weight:500">(You)</span>' : ''}</div><div style="font-size:9px;color:var(--text-mute);font-family:monospace">${u.id}</div></div><button class="picker-remove-btn" style="background:transparent;border:none;color:var(--danger);cursor:pointer;padding:8px" onclick="window.removePickerUser('${u.id}')"><i data-lucide="x" style="width:14px;height:14px"></i></button></div>`).join('');
    };
    window.removePickerUser = id => { S.selectedAllowedUsers = S.selectedAllowedUsers.filter(u => u.id !== id); rendPickSel(); };
    window.addUserById = async () => {
        const inp = $('picker-id-input'), id = inp.value.trim(); if (!id) return window.toast("Enter ID."); if (S.selectedAllowedUsers.find(u => u.id === id)) return window.toast("Already added.");
        window.setLoading(true, "Fetching..."); const { data, error } = await db.from('profiles').select('id, full_name, avatar_url, updated_at').eq('id', id).single(); window.setLoading(false);
        if (error || !data) return window.toast("Not found.");
        await L.put('profiles', data); S.profileCache[data.id] = data; S.selectedAllowedUsers.push({ id: data.id, name: data.full_name, avatar: data.avatar_url }); rendPickSel(); inp.value = ''; window.toast("Added.");
    };
    window.openOverlay = () => { const o = $('overlay-container'); if (o) { o.classList.add('active'); S.ui.isOverlayOpen = true; } };
    window.closeOverlay = () => { const o = $('overlay-container'); if (o) { o.classList.remove('active'); S.ui.isOverlayOpen = false; S.ui.overlayCloseLocked = false; } };
    window.showOverlayView = vid => { const p = document.querySelector('.panel-card'); if (!p) return; p.querySelectorAll('.view-content').forEach(v => v.classList.remove('active')); const t = $(`view-${vid}`); if (t) t.classList.add('active'); };

    window.prepareAccountPage = async () => {
        if (!S.user) return; const { data: p } = await db.from('profiles').select('avatar_url, full_name').eq('id', S.user.id).single(); const n = p?.full_name || S.user.user_metadata?.full_name || "User", av = p?.avatar_url || S.user.user_metadata?.avatar_url;
        $('acc-page-name').innerText = n; $('acc-page-type').innerText = "Full Account"; $('acc-page-id').innerText = S.user.id;
        const aP = $('acc-page-avatar'); if (av) aP.innerHTML = `<img src="${av}">`; else aP.innerText = n.charAt(0);
        $('acc-email-wrapper').style.display = 'block'; $('acc-page-email').innerText = S.user.email || "Not set";
    };
    window.copyAccountId = () => { if (!S.user) return; navigator.clipboard.writeText(S.user.id); window.toast("ID copied."); };
    window.copyInfoId = () => { if (!S.currentRoomId) return; navigator.clipboard.writeText(S.currentRoomId); window.toast("ID copied."); };

    const updLobbyAv = async () => {
        if (!S.user) return; const b = $('lobby-avatar-btn'); if (!b) return;
        let av = S.user.user_metadata?.avatar_url, nm = S.user.user_metadata?.full_name;
        if (!av || !nm) { const { data } = await db.from('profiles').select('avatar_url, full_name').eq('id', S.user.id).single(); if (data) { av = data.avatar_url; nm = data.full_name; } }
        const p = await getProf(S.user.id); if (p?.avatar_url) av = p.avatar_url;
        if (av) b.innerHTML = `<img src="${av}">`; else b.innerText = (nm || "U").charAt(0);
    };
    const getDateLbl = d => {
        const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate()), tg = new Date(d.getFullYear(), d.getMonth(), d.getDate()), df = Math.round((t - tg) / 86400000);
        if (df === 0) return "Today"; if (df === 1) return "Yesterday"; if (df < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' }); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };
    const procT = t => { let x = esc(t); return x.replace(/(https?:\/\/[^\s]+)/g, u => `<a href="${u.replace(/[<>"']/g, '')}" target="_blank" rel="noopener noreferrer" class="chat-link">${u}</a>`); };
    const chkEmpty = () => { return; };
    const renderM = (m, pM, isD, opt = false) => {
        if (!m) return "";
        const isDel = m.deleted === true, isEd = m.updated_at && !isDel && new Date(m.updated_at).getTime() > new Date(m.created_at).getTime() + 1000;
        let h = ""; const dObj = new Date(m.created_at), cLbl = getDateLbl(dObj);
        const isGrp = !pM || pM.user_id !== m.user_id || getDateLbl(new Date(pM.created_at)) !== cLbl;
        if (isGrp && cLbl !== S.lastRenderedDateLabel) { h += `<div class="date-divider"><span class="date-label">${cLbl}</span></div>`; S.lastRenderedDateLabel = cLbl; }
        const dNm = trunc(m.user_name || 'User', 18), cls = opt ? 'msg-optimistic' : (isGrp ? 'group-start' : 'msg-continuation'), sCls = m.user_id === S.user?.id ? 'me' : 'not-me';
        const sTxt = isDel ? '' : esc(m.text || '').replace(/"/g, '&quot;'), dAttr = `data-id="${m.id}" data-uid="${m.user_id}" data-time="${m.created_at}" data-text="${sTxt}"`;
        const tStr = m.time || getTime(m.created_at);
        h += `<div class="msg ${sCls} ${cls} ${isDel ? 'msg-deleted' : ''} ${opt ? 'msg-pending' : ''} pop-in" ${dAttr}>`;
        if (isDel) h += `${isGrp && !isD ? `<div class="msg-header"><span class="msg-user">${esc(dNm)}</span></div>` : ''}<div class="deleted-text">Message deleted</div><span class="msg-time">${tStr}</span>`;
        else h += `${isGrp && !isD ? `<div class="msg-header"><span class="msg-user">${esc(dNm)}</span></div>` : ''}<div>${procT(m.text)}</div><span class="msg-time">${tStr}${isEd ? '<span class="edited-tag">(Edited)</span>' : ''}</span>`;
        h += `</div>`; return h;
    };
    const handleScroll = () => { const c = $('chat-messages'); if (!c) return; if (c.scrollTop < 50 && !S.isLoadingHistory && S.hasMoreHistory) loadMoreHist(); };
    const loadMoreHist = async () => {
        if (!S.oldestMessageTimestamp || !S.currentRoomId) return; S.isLoadingHistory = true; const c = $('chat-messages'), oSH = c.scrollHeight;
        c.insertAdjacentHTML('afterbegin', '<div id="history-loader" style="text-align:center;padding:10px;font-size:11px;color:var(--text-mute)">Loading...</div>');
        const { data, error } = await db.from('messages').select('*').eq('room_id', S.currentRoomId).lt('created_at', S.oldestMessageTimestamp).order('created_at', { ascending: false }).limit(C.historyLoadLimit);
        const l = $('history-loader'); if (l) l.remove();
        if (error || !data?.length) { S.hasMoreHistory = false; S.isLoadingHistory = false; return; }
        data.reverse();
        try {
            const r = await wExec('decryptHistory', { messages: data, keyId: S.currentRoomId }), vMs = r.results.filter(m => !m.error);
            if (vMs.length) { S.oldestMessageTimestamp = vMs[0].created_at; let h = "", p = null; vMs.forEach(m => { h += renderM(m, p, S.currentRoomData?.is_direct); p = m; }); c.insertAdjacentHTML('afterbegin', h); c.scrollTop = c.scrollHeight - oSH; await L.putAll('messages', vMs.map(m => ({ ...m, room_id: S.currentRoomId }))); }
        } catch (e) { }
        S.isLoadingHistory = false;
    };
    window.openRoomInfo = async () => {
        if (!S.currentRoomData) return; window.setLoading(true, "Loading info..."); const r = S.currentRoomData;
        const dB = $('info-delete-btn'), cR = $('info-creator-row'); dB.style.display = 'none'; dB.innerText = "Delete Chat"; dB.classList.remove('active');
        if (S.deleteConfirmTimeout) clearTimeout(S.deleteConfirmTimeout);
        $('info-id').innerText = r.id;
        const d = new Date(r.created_at); $('info-date').innerText = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const disp = await resolveDisp(r); $('info-name').innerText = disp.name;
        const aE = $('info-avatar'); if (disp.avatar) aE.innerHTML = `<img src="${disp.avatar}">`; else aE.innerText = disp.name.charAt(0);
        if (r.is_direct) { $('info-type').innerText = "Direct Message"; cR.style.display = 'none'; dB.style.display = 'flex'; }
        else {
            $('info-type').innerText = "Group Chat"; cR.style.display = 'flex';
            if (r.created_by) { let p = S.profileCache[r.created_by]; if (!p) { const { data } = await db.from('profiles').select('full_name').eq('id', r.created_by).single(); p = data; if (data) S.profileCache[r.created_by] = data; } $('info-creator').innerText = p?.full_name || 'Unknown'; }
            else $('info-creator').innerText = 'Unknown';
            if (r.created_by === S.user.id) dB.style.display = 'flex';
        }
        updPresenceUI(); window.setLoading(false); window.showOverlayView('room-info'); window.openOverlay();
    };
    window.initiateDeleteRoom = () => { const b = $('info-delete-btn'); if (b.classList.contains('active')) window.deleteRoom(); else { b.classList.add('active'); b.innerText = "Tap again to confirm"; S.deleteConfirmTimeout = setTimeout(() => { b.classList.remove('active'); b.innerText = "Delete Chat"; }, 3000); } };
    window.openRoomSettings = async () => {
        window.closeOverlay(); if (!S.currentRoomId || !S.currentRoomData || S.currentRoomData.created_by !== S.user.id) return window.toast("Access denied.");
        window.setLoading(true, "Loading..."); const r = S.currentRoomData;
        S.currentStep.edit = 1; updStepUI('edit');
        $('edit-room-name').value = r.name; $('edit-room-visible').checked = r.is_visible; $('edit-room-pass').value = '';
        const pL = $('pass-status-label'), rB = $('btn-remove-pass');
        if (r.has_password) { pL.innerText = "Active"; pL.style.color = "var(--success)"; rB.style.display = 'block'; }
        else { pL.innerText = "Not Set"; pL.style.color = "var(--text-mute)"; rB.style.display = 'none'; }
        S.removePasswordFlag = false; S.selectedAllowedUsers = [];
        const ids = r.allowed_users;
        if (ids && !ids.includes('*')) { const { data: pArr } = await db.from('profiles').select('id, full_name, avatar_url').in('id', ids); S.selectedAllowedUsers = ids.map(id => { const p = pArr?.find(x => x.id === id); return { id, name: p?.full_name || 'Unknown', avatar: p?.avatar_url }; }); }
        window.showOverlayView('room-settings'); window.openOverlay(); window.setLoading(false);
    };
    window.prepareRemovePassword = () => { S.removePasswordFlag = true; $('pass-status-label').innerText = "Will be removed"; $('pass-status-label').style.color = "var(--danger)"; $('edit-room-pass').value = ''; $('edit-room-pass').disabled = true; };
    window.saveRoomSettings = async e => {
        if (!e?.isTrusted || S.processingAction) return; S.processingAction = true;
        const n = $('edit-room-name').value.trim(), vis = $('edit-room-visible').checked, nP = $('edit-room-pass').value;
        let aus = S.selectedAllowedUsers.length ? S.selectedAllowedUsers.map(u => u.id) : ['*'];
        if (!aus.includes(S.user.id)) aus.push(S.user.id);
        if (!n) { window.toast("Name required."); S.processingAction = false; return; }
        const rm = S.currentRoomData, chP = nP.length > 0, rmP = S.removePasswordFlag;
        window.setLoading(true, "Saving..."); const upd = { name: n, is_visible: vis, allowed_users: aus };
        if (rmP) upd.has_password = false; else if (chP) upd.has_password = true;
        const { error: uE } = await db.from('rooms').update(upd).eq('id', S.currentRoomId);
        if (uE) { window.toast("Save failed."); window.setLoading(false); S.processingAction = false; return; }
        if (rmP) { await db.rpc('set_room_password', { p_room_id: S.currentRoomId, p_hash: null }); S.currentRoomData.has_password = false; }
        else if (chP) { const h = await sha256(nP + rm.salt); await db.rpc('set_room_password', { p_room_id: S.currentRoomId, p_hash: h }); S.currentRoomData.has_password = true; }
        const { data: uR } = await db.from('rooms').select('*').eq('id', S.currentRoomId).single();
        S.currentRoomData = uR; S.currentRoomDisplay = await resolveDisp(uR); $('chat-title').innerText = S.currentRoomDisplay.name;
        window.toast("Saved."); window.closeOverlay(); S.processingAction = false; window.setLoading(false);
    };
    window.deleteRoom = async () => { if (!S.currentRoomId) return; window.setLoading(true, "Deleting..."); const { error } = await db.from('rooms').delete().eq('id', S.currentRoomId); if (error) { window.toast("Failed."); window.setLoading(false); return; } window.toast("Deleted."); S.currentRoomId = null; S.currentRoomData = null; window.closeOverlay(); window.nav('scr-lobby'); window.loadRooms(); window.setLoading(false); };
    
    window.openVault = async (id, n, rawP, rSalt, cD = null) => {
        if (!S.user) return window.toast("Please log in."); if (S.isCapacityBlocked) return;
        window.setLoading(true, "Opening chat..."); S.currentRoomPassword = rawP;
        await cleanChans(true); if (!S.isOfflineMode) db.realtime?.connect();
        S.currentRoomId = id; S.lastRenderedDateLabel = null; S.oldestMessageTimestamp = null; S.hasMoreHistory = true; S.isLoadingHistory = false;
        const cC = $('chat-messages'); cC.innerHTML = ''; cC.onscroll = handleScroll;
        let rD = null;
        if (S.isOfflineMode) {
            rD = await L.get('rooms', id); if (!rD) { window.setLoading(false); return window.toast("Not found locally."); }
            S.currentRoomData = rD; const isD = rD?.is_direct;
            S.currentRoomDisplay = await resolveDisp(rD); $('chat-title').innerText = S.currentRoomDisplay.name;
            const aE = $('chat-avatar-display'); if (S.currentRoomDisplay.avatar) aE.innerHTML = `<img src="${S.currentRoomDisplay.avatar}">`; else aE.innerText = S.currentRoomDisplay.name.charAt(0).toUpperCase();
            const eB = $('info-edit-btn'); if (!isD && rD?.created_by === S.user.id) eB.style.display = 'flex'; else eB.style.display = 'none';
            const kS = rawP ? (rawP + id) : id; await deriveKey(kS, rD?.salt, id);
            let lM = await L.getRoomMsgs(id); let h = ''; if (lM.length) { let p = null; lM.forEach(m => { h += renderM(m, p, isD); p = m; }); cC.innerHTML = h; cC.scrollTop = cC.scrollHeight; }
            chkEmpty(); $('chat-input').style.display = 'block'; $('send-btn').style.display = 'flex'; setConnVis('offline'); window.nav('scr-chat'); window.setLoading(false); return;
        }
        if (cD) rD = cD; else { try { const { data: nR } = await execQ(db.from('rooms').select('*').eq('id', id).single()); if (nR?.id) { rD = nR; await L.put('rooms', rD); } } catch (e) { } }
        if (!rD) { window.setLoading(false); return window.toast("Not found."); }
        S.currentRoomData = rD; const isD = rD?.is_direct;
        S.currentRoomDisplay = await resolveDisp(rD); $('chat-title').innerText = S.currentRoomDisplay.name;
        const aE = $('chat-avatar-display'); if (S.currentRoomDisplay.avatar) aE.innerHTML = `<img src="${S.currentRoomDisplay.avatar}">`; else aE.innerText = S.currentRoomDisplay.name.charAt(0).toUpperCase();
        const eB = $('info-edit-btn'); if (!isD && rD.created_by === S.user.id) eB.style.display = 'flex'; else eB.style.display = 'none';
        const kS = rawP ? (rawP + id) : id; await deriveKey(kS, rD?.salt, id);
        let fM = [];
        try {
            const { data } = await execQ(db.from('messages').select('*').eq('room_id', id).order('created_at', { ascending: false }).limit(C.maxMessages));
            if (data?.length) { data.reverse(); const r = await wExec('decryptHistory', { messages: data, keyId: id }); const vM = r.results.filter(m => !m.error); await L.clearRoomMsgs(id); await L.putAll('messages', vM.map(m => ({ ...m, room_id: id }))); fM = vM; }
            else await L.clearRoomMsgs(id);
        } catch (e) { console.error("Fetch error", e); }
        window.nav('scr-chat');
        if (fM.length) { S.oldestMessageTimestamp = fM[0].created_at; let h = '', p = null; fM.forEach(m => { h += renderM(m, p, isD); p = m; }); cC.innerHTML = h; }
        chkEmpty(); $('chat-input').style.display = 'block'; $('send-btn').style.display = 'flex'; setConnVis('connecting');
        await initRoomPres(id); await setupChatChan(id);
        setTimeout(() => { cC.scrollTop = cC.scrollHeight; window.setLoading(false); }, 100);
    };
    const applyRL = () => { const n = Date.now(); if (n - S.lastMessageTime < C.rateLimitMs) return false; return true; };
    window.sendMsg = async e => {
        if (!e?.isTrusted || !S.user || !S.currentRoomId || S.processingAction || S.isOfflineMode || !S.isChatChannelReady || S.isCapacityBlocked || !applyRL()) return;
        const v = $('chat-input').value.trim(); if (!v) return; if (v.length > C.maxMessageLength) return window.toast(`Max ${C.maxMessageLength} chars.`);
        S.processingAction = true; $('chat-input').value = ''; S.lastMessageTime = Date.now();
        try { const enc = await encMsg(v, S.currentRoomId); const { error } = await db.from('messages').insert([{ room_id: S.currentRoomId, user_id: S.user.id, user_name: S.user.user_metadata?.full_name, content: enc }]).select().single(); if (error) window.toast("Failed."); } catch (er) { window.toast("Failed."); }
        S.processingAction = false;
    };
    window.leaveChat = async () => { window.setLoading(true, "Leaving..."); S.currentRoomId = null; S.currentRoomData = null; await cleanChans(true); setConnVis('offline'); if ($('info-edit-btn')) $('info-edit-btn').style.display = 'none'; window.nav('scr-lobby'); window.loadRooms(); window.setLoading(false); };

    window.handleLogin = async e => {
        if (!e?.isTrusted || S.processingAction) return; S.processingAction = true;
        const em = $('l-email').value, p = $('l-pass').value; if (!em || !p) { window.toast("Missing."); S.processingAction = false; return; }
        window.setLoading(true, "Signing In...");
        if (!navigator.onLine) {
            const kU = await L.get('known_users', em); if (kU?.metadata) { const hI = await sha256(p + em); if (kU.pass_hash === hI) { S.user = { id: kU.userId, email: kU.email, user_metadata: kU.metadata }; setMode(true); window.nav('scr-lobby'); window.loadRooms(); window.setLoading(false); S.processingAction = false; window.toast("Offline login."); return; } }
            window.toast("No offline account."); window.setLoading(false); S.processingAction = false; return;
        }
        const succ = await attemptLogin(em, p);
        if (succ) { localStorage.setItem('hrn_auth_email', em); localStorage.setItem('hrn_auth_pass', p); setMode(false); if (S.user) setupGlobPres(S.user.id); window.nav('scr-lobby'); window.loadRooms(); window.toast("Connected."); }
        else window.toast("Invalid!");
        window.setLoading(false); S.processingAction = false;
    };
    window.handleRegister = async e => {
        if (!e?.isTrusted || S.processingAction) return; S.processingAction = true;
        const nm = $('r-name').value, em = $('r-email').value.trim().toLowerCase(), p = $('r-pass').value;
        const cA = $('r-avatar-url').value.trim(), av = cA || S.selectedAvatar;
        if (!nm || !em || p.length < 8) { window.toast("Invalid."); S.processingAction = false; return; }
        if (!navigator.onLine) { window.toast("Online required."); S.processingAction = false; return; }
        window.setLoading(true, "Sending Code...");
        try {
            const [r, err] = await safeAwait(fetch(C.mailApi, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", email: em }) }));
            if (err) throw err;
            if (r) {
                if (r.status === 429) { window.toast("Too many attempts."); S.processingAction = false; window.setLoading(false); return; }
                const j = await r.json();
                if (j.message === "Code sent") { sessionStorage.setItem('temp_reg', JSON.stringify({ n: nm, em, p, avatar: av })); window.nav('scr-verify'); startVT(); window.setLoading(false); }
                else { window.toast("Send failed."); window.setLoading(false); }
            }
        } catch (er) { window.toast("Network error."); window.setLoading(false); }
        S.processingAction = false;
    };
    const startVT = () => { let l = C.verificationCodeExpiry; if (S.vTimer) clearInterval(S.vTimer); S.vTimer = setInterval(() => { l--; $('v-timer').innerText = `${Math.floor(l/60)}:${(l%60).toString().padStart(2,'0')}`; if (l <= 0) { clearInterval(S.vTimer); window.nav('scr-register'); } }, 1000); };
    window.handleVerify = async e => {
        if (!e?.isTrusted || S.processingAction) return; S.processingAction = true;
        const code = $('v-code').value, temp = JSON.parse(sessionStorage.getItem('temp_reg'));
        if (!temp) { window.toast("Session expired."); S.processingAction = false; return; }
        window.setLoading(true, "Verifying...");
        try {
            const r = await fetch(C.mailApi, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", email: temp.em, code: code }) });
            if (r.status === 429) { window.toast("Too many attempts."); S.processingAction = false; window.setLoading(false); return; }
            const j = await r.json();
            if (j.message === "Verified") await finReg(temp); else { window.toast("Invalid code."); window.setLoading(false); }
        } catch (er) { window.toast("Failed."); window.setLoading(false); }
        S.processingAction = false;
    };
    const finReg = async t => {
        const { error } = await db.auth.signUp({ email: t.em, password: t.p, options: { data: { full_name: t.n, avatar_url: t.avatar } } });
        if (error) { window.toast("Reg failed."); window.setLoading(false); }
        else { localStorage.setItem('hrn_auth_email', t.em); localStorage.setItem('hrn_auth_pass', t.p); window.nav('scr-lobby'); window.loadRooms(); window.setLoading(false); }
    };
    window.handleCreate = async e => {
        if (!e?.isTrusted || S.processingAction) return; S.processingAction = true;
        const isD = S.createType === 'direct';
        let n, vis = true, tU = null, av = null, rawP = null;
        if (isD) {
            tU = $('c-target-user').value.trim(); if (!tU) { window.toast("ID required."); S.processingAction = false; return; }
            const { data: p, error } = await db.from('profiles').select('id, full_name, avatar_url, updated_at').eq('id', tU).single();
            if (error || !p) { window.toast("User not found."); S.processingAction = false; return; }
            await L.put('profiles', p); S.profileCache[p.id] = p; n = "Direct Message"; vis = true;
        } else {
            n = $('c-name').value.trim(); const iU = $('c-avatar').value.trim(); av = iU || null; rawP = $('c-pass').value; vis = $('c-visible').checked;
            if (!n) { window.toast("Name required."); S.processingAction = false; window.setLoading(false); return; }
        }
        let aus = ['*'];
        if (isD) aus = [S.user.id, tU];
        else { if (S.selectedAllowedUsers.length) { aus = S.selectedAllowedUsers.map(u => u.id); if (!aus.includes(S.user.id)) aus.push(S.user.id); } }
        window.setLoading(true, "Creating..."); const salt = genSalt();
        const insD = { name: n, avatar_url: av, has_password: !!rawP, is_visible: vis, salt: salt, created_by: S.user.id, allowed_users: aus, is_direct: isD };
        const { data, error } = await db.from('rooms').insert([insD]).select();
        if (error) { window.toast("Failed."); S.processingAction = false; window.setLoading(false); return; }
        if (data?.length) {
            const nR = data[0];
            if (rawP) { const h = await sha256(rawP + salt); await db.rpc('set_room_password', { p_room_id: nR.id, p_hash: h }); }
            await L.put('rooms', nR); S.lastCreated = nR; S.lastCreatedPass = rawP;
            $('s-id').innerText = nR.id; window.nav('scr-success'); S.selectedAllowedUsers = [];
        }
        S.processingAction = false; window.setLoading(false);
    };
    window.submitGate = async e => {
        if (!e?.isTrusted) return; const iP = $('gate-pass').value;
        if (S.isOfflineMode) { window.openVault(S.pending.id, S.pending.name, iP, S.pending.salt, S.pending); return; }
        const iH = await sha256(iP + S.pending.salt); window.setLoading(true, "Verifying...");
        const { data } = await db.rpc('verify_room_password', { p_room_id: S.pending.id, p_hash: iH }); window.setLoading(false);
        if (data === true) window.openVault(S.pending.id, S.pending.name, iP, S.pending.salt, S.pending); else window.toast("Incorrect.");
    };
    window.handleLogout = async e => {
        if (!e?.isTrusted) return; window.setLoading(true, "Leaving...");
        S.currentRoomId = null; S.user = null; await fullDisc();
        localStorage.removeItem('hrn_auth_email'); localStorage.removeItem('hrn_auth_pass');
        setMode(false); S.isCapacityBlocked = false; await db.auth.signOut();
        if (S.authListener) { S.authListener.unsubscribe(); S.authListener = null; }
        window.nav('scr-start'); window.setLoading(false);
    };
    window.copySId = () => { if (!S.lastCreated) return; navigator.clipboard.writeText(S.lastCreated.id); window.toast("ID copied."); };
    window.enterCreated = () => { if (!S.lastCreated) return; window.openVault(S.lastCreated.id, S.lastCreated.name, S.lastCreatedPass, S.lastCreated.salt, S.lastCreated); S.lastCreatedPass = null; };
    
    const { data: { subscription } } = db.auth.onAuthStateChange(async (ev, ses) => {
        if (S.isOfflineMode && !ses) return; S.user = ses?.user;
        if (S.user && !S.isOfflineMode) setupGlobPres(S.user.id);
        const cB = $('icon-plus-lobby'); if (cB) cB.style.display = 'flex';
        if (ev === 'SIGNED_OUT') { await fullDisc(); window.nav('scr-start'); }
    });
    S.authListener = subscription;

    window.nav = (id, dir = null) => {
        if (S.isNavigating) return; S.isNavigating = true;
        requestAnimationFrame(() => {
            const curr = document.querySelector('.screen.active'), next = $(id); if (!next) { S.isNavigating = false; return; }
            if (id === 'scr-create') { S.currentStep.create = 1; S.selectedAllowedUsers = []; S.createType = 'group'; updStepUI('create'); $('c-name').value = ''; $('c-target-user').value = ''; $('c-pass').value = ''; $('c-avatar').value = ''; document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected')); $('type-group').classList.add('selected'); }
            if (id === 'scr-register') { S.currentStep.reg = 1; S.selectedAvatar = null; $('r-name').value = ''; $('r-email').value = ''; $('r-pass').value = ''; $('r-avatar-url').value = ''; updStepUI('reg'); }
            if (id === 'scr-account') window.prepareAccountPage();
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('slide-left', 'slide-right'));
            if (dir === 'left') { if (curr) curr.classList.add('slide-left'); next.classList.remove('slide-right'); }
            else if (dir === 'right') { if (curr) curr.classList.add('slide-right'); next.classList.remove('slide-left'); }
            else document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            next.classList.add('active');
            const cB = $('icon-plus-lobby'); if (cB) cB.style.display = 'flex';
            if (id === 'scr-lobby') updLobbyAv();
            setTimeout(() => { S.isNavigating = false; }, 400);
        });
    };
    window.refreshLobby = async () => { const n = Date.now(); if (n - S.lastLobbyRefresh < 10000) return window.toast("Wait."); S.lastLobbyRefresh = n; await window.loadRooms(); };
    window.loadRooms = async () => {
        if (!S.user) return; const uid = S.user.id;
        const proc = async rms => { const p = []; for (const r of rms) { if (!r?.id) continue; const d = await resolveDisp(r); p.push({ ...r, display_name: d.name, display_avatar: d.avatar }); } S.allRooms = p; window.filterRooms(); };
        if (S.isOfflineMode) { const lR = await L.getAll('rooms'); await proc(lR); updLobbyAv(); return; }
        window.setLoading(true, "Syncing...");
        try { const { data: rms, error } = await execQ(db.from('rooms').select('*').order('created_at', { ascending: false })); if (error) throw error; if (rms) { await L.clear('rooms'); if (rms.length) await L.putAll('rooms', rms); await L.saveUserTree(uid, rms); await proc(rms); } } catch (e) { window.toast("Sync failed."); }
        window.setLoading(false); updLobbyAv();
    };
    window.filterRooms = () => {
        const q = $('search-bar').value.toLowerCase(), list = $('room-list'), uid = S.user?.id;
        const f = S.allRooms.filter(r => { if (!r.is_direct && !r.is_visible) return false; const nm = r.display_name || r.name || ''; return nm.toLowerCase().includes(q); });
        if (!f.length) list.innerHTML = "";
        else list.innerHTML = f.map(r => `<div class="room-card" onclick="window.joinAttempt('${r.id}')"><div class="chat-avatar" style="width:36px;height:36px;margin-right:10px;font-size:13px">${r.display_avatar ? `<img src="${r.display_avatar}">` : (r.display_name||'G').charAt(0)}</div><span class="room-name">${esc(r.display_name)}</span><span class="room-icon">${r.is_direct ? '<i data-lucide="user" style="width:14px;height:14px"></i>' : ''}${r.has_password ? '<i data-lucide="lock" style="width:14px;height:14px"></i>' : ''}</span></div>`).join('');
    };
    window.joinAttempt = async id => {
        const openL = async () => { const m = await L.get('rooms', id); if (m?.id) { S.pending = m; if (m.has_password) { updGateUI(m); window.nav('scr-gate'); } else await window.openVault(m.id, m.name, null, m.salt, m); } else window.toast("Not found locally."); };
        if (S.isOfflineMode) { await openL(); return; }
        window.setLoading(true, "Accessing...");
        try {
            const { data: can, error: rE } = await execQ(db.rpc('can_access_room', { p_room_id: id })); if (rE || !can) throw new Error("Denied");
            const { data, error } = await execQ(db.from('rooms').select('*').eq('id', id).single()); if (error) throw error;
            window.setLoading(false); if (data?.id) await L.put('rooms', data); S.pending = data;
            if (data.has_password) { updGateUI(data); window.nav('scr-gate'); } else window.openVault(data.id, data.name, null, data.salt, data);
        } catch (e) { window.setLoading(false); window.toast("Connection lost."); setMode(true); await openL(); }
    };
    window.joinPrivate = async () => {
        if (!S.user) return window.toast("Login required."); const id = $('join-id').value.trim(); if (!id) return;
        if (S.isOfflineMode) { const m = await L.get('rooms', id); if (m) window.joinAttempt(id); else window.toast("Connection required."); return; }
        window.setLoading(true, "Checking...");
        try {
            const { data: can } = await execQ(db.rpc('can_access_room', { p_room_id: id })); if (!can) { window.setLoading(false); return window.toast("Denied."); }
            const { data } = await execQ(db.from('rooms').select('*').eq('id', id).single()); window.setLoading(false);
            if (data) { await L.put('rooms', data); S.pending = data; if (data.has_password) { updGateUI(data); window.nav('scr-gate'); } else window.openVault(data.id, data.name, null, data.salt, data); }
            else window.toast("Not found.");
        } catch (e) { window.setLoading(false); window.toast("Error."); }
    };
    const init = async () => {
        await L.init(); monitorConn(); if (navigator.onLine) await warmAv();
        const sE = localStorage.getItem('hrn_auth_email'), sP = localStorage.getItem('hrn_auth_pass');
        if (navigator.onLine) {
            setMode(false); setupGlobPres(null);
            if (sE && sP) { window.setLoading(true, "Auto-logging in..."); const succ = await attemptLogin(sE, sP); window.setLoading(false); if (succ) { setupGlobPres(S.user.id); window.nav('scr-lobby'); window.loadRooms(); } else { const kU = await L.get('known_users', sE); const hI = await sha256(sP + sE); if (kU?.pass_hash === hI) { S.user = { id: kU.userId, email: kU.email, user_metadata: kU.metadata }; setMode(true); window.nav('scr-lobby'); window.loadRooms(); window.toast("Offline."); } else { localStorage.removeItem('hrn_auth_email'); localStorage.removeItem('hrn_auth_pass'); window.nav('scr-start'); } } } else window.nav('scr-start');
        } else { setMode(true); startNetChk(); if (sE && sP) { const kU = await L.get('known_users', sE); const hI = await sha256(sP + sE); if (kU?.pass_hash === hI) { S.user = { id: kU.userId, email: kU.email, user_metadata: kU.metadata }; window.nav('scr-lobby'); window.loadRooms(); window.toast("Offline."); } else { window.nav('scr-login'); $('l-email').value = sE; $('l-pass').value = sP; } } else window.nav('scr-start'); }
        window.setLoading(false);
    };
    const warmAv = async () => { if (S.isOfflineMode) return; const pArr = await L.getAll('profiles'); if (pArr?.length) pArr.forEach(p => { if (p?.id) S.profileCache[p.id] = p; }); };
    init();
}
