import { supabase, AppState, PLATFORM_VERSION } from 'https://cdn.doruklu.com/supabase-config.js';

import { ui } from 'https://cdn.doruklu.com/ui.js';
import { initAdminPanel, loadUserLinks, initCardManager } from './app.js';

let _loginHandled = false;

console.log("Doruklu Auth Loaded - v1.1.2_FIXED");

export async function initAuth() {    
    // 0. Otomatik Versiyon Kontrolü (Cache Busting)
    const storedVersion = localStorage.getItem('DORUKLU_PLATFORM_VERSION');
    if (storedVersion !== PLATFORM_VERSION) {
        console.log(`[Platform Hub] Yeni versiyon tespit edildi. Önbellek temizleniyor...`);
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('DORUKLU_PLATFORM_VERSION', PLATFORM_VERSION);
        window.location.reload(true);
        return;
    }

    // Redirect parametresini kaydet
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect_to');
    if (redirectTo) {
        localStorage.setItem('redirect_to', redirectTo);
    }

    // Giriş butonlarını her ihtimale karşı EN BAŞTA aktif et
    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) googleBtn.onclick = handleGoogleLogin;

    const ssoToken = urlParams.get('sso_token');
    const ssoRefresh = urlParams.get('sso_refresh');
    if (ssoToken && ssoRefresh) {
        ui.setLoading(true);
        try {
            const { error } = await supabase.auth.setSession({
                access_token: ssoToken,
                refresh_token: ssoRefresh
            });
            if (error) console.error("SSO Token Relay Error:", error);
            ui.setLoading(false);
            if (!error) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (e) {
            console.error("SSO Fatal Error:", e);
            ui.setLoading(false);
        }
    }

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error("Session fetch error (check clock skew):", sessionError);
        }

        if (session) {
            await handleLoginSuccess(session.user, session);
        } else {
            setTimeout(() => {
                if (!_loginHandled) {
                    ui.showScreen('auth-screen');
                }
            }, 1000);
        }
    } catch (err) {
        console.error("Auth initialization failed:", err);
        ui.showScreen('auth-screen');
    }

    async function handleLoginSuccess(user, session) {
        if (_loginHandled) return;
        _loginHandled = true;
        console.log("Login success for:", user.email);

        try {
            // Bekleyen subdomain redirect'i varsa token relay yap
            const storedRedirect = localStorage.getItem('redirect_to');
            if (storedRedirect) {
                localStorage.removeItem('redirect_to');
                if (session && session.access_token) {
                    const url = new URL(storedRedirect);
                    url.searchParams.set('sso_token', session.access_token);
                    url.searchParams.set('sso_refresh', session.refresh_token);
                    window.location.href = url.toString();
                    return;
                }
            }

            AppState.user = user;
            
            // Profil çek/oluştur CDN auth.js'e devredildi ancak burada manuel çekiyoruz (main hub özel durumu)
            let { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;

            if (!profile) {
                // Manuel Fallback (CDN auth.js hallediyor ama burada da emniyet için kalsın)
                const { data: newP } = await supabase.from('profiles').insert({ id: user.id, role: 'player', display_name: user.email.split('@')[0] }).select().single();
                profile = newP;
            }

            AppState.profile = profile || { role: 'player', permissions: {} };
            
            // Global Header & Badge (manageCallback KALDIRILDI - Dashboard tetiği var)
            ui.renderGlobalHeader("Portalı");
            ui.renderUserBadge(user, AppState.profile, async () => {
                const { clearAllCaches } = await import('https://cdn.doruklu.com/auth.js');
                await clearAllCaches();
                await supabase.auth.signOut();
                window.location.href = 'https://doruklu.com/?logout=true';
            });
            
            ui.showScreen('dashboard-screen');
            
            if (AppState.profile.role === 'super_admin' || AppState.profile.role === 'admin') {
                document.getElementById('admin-quick-access').style.display = 'block';
                initAdminPanel();
            } else {
                document.getElementById('admin-quick-access').style.display = 'none';
            }

            
            loadUserLinks();
        } catch (err) {
            console.error("Login handling failed:", err);
            _loginHandled = false; // Kullanıcı tekrar deneyebilsin
            ui.showScreen('auth-screen');
            ui.showError("Oturum doğrulanamadı, lütfen tekrar giriş yapın.");
        }
    }
}

async function handleGoogleLogin() {
    const redirectTo = window.location.origin;
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectTo
        }
    });
}

async function handleLogout() {
    await supabase.auth.signOut();
    AppState.user = null;
    AppState.profile = null;
    ui.showScreen('auth-screen');
}
