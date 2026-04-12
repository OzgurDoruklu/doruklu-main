import { supabase, AppState } from 'https://cdn.doruklu.com/supabase-config.js';
import { ui } from 'https://cdn.doruklu.com/ui.js';
import { initAdminPanel, loadUserLinks, initCardManager } from './app.js';

export async function initAuth() {    
    // Redirect parametresini kaydet
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect_to');
    if (redirectTo) {
        localStorage.setItem('redirect_to', redirectTo);
    }

    // Giriş butonlarını her ihtimale karşı EN BAŞTA aktif et (Donmayı önlemek için)
    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) googleBtn.onclick = handleGoogleLogin;
    
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    let _loginHandled = false;

    // Auth state listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            await handleLoginSuccess(session.user, session);
        }
    });

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        await handleLoginSuccess(session.user, session);
    } else {
        setTimeout(() => {
            if (!_loginHandled) {
                ui.showScreen('auth-screen');
            }
        }, 1000);
    }

    async function handleLoginSuccess(user, session) {
        if (_loginHandled) return;
        _loginHandled = true;

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
            
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;

            AppState.profile = profile || { role: 'player', permissions: {} };
            
            ui.renderUserBadge(user, AppState.profile, async () => {
                const { clearAllCaches } = await import('https://cdn.doruklu.com/auth.js');
                await clearAllCaches();
                await supabase.auth.signOut();
                window.location.href = 'https://doruklu.com/?logout=true';
            }, () => {
                // Management Callback
                if (AppState.profile.role === 'super_admin' || AppState.profile.role === 'admin') {
                    document.getElementById('dashboard-screen').style.display = 'none';
                    document.getElementById('management-screen').style.display = 'flex';
                }
            });
            
            ui.showScreen('dashboard-screen');
            
            if (AppState.profile.role === 'super_admin' || AppState.profile.role === 'admin') {
                document.getElementById('admin-container').style.display = 'block';
                initAdminPanel();
                initCardManager();
            } else {
                document.getElementById('admin-container').style.display = 'none';
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
