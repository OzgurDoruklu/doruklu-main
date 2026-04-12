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

    document.getElementById('google-btn').addEventListener('click', handleGoogleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    async function handleLoginSuccess(user, session) {
        if (_loginHandled) return;
        _loginHandled = true;

        // Bekleyen subdomain redirect'i varsa token relay yap
        const storedRedirect = localStorage.getItem('redirect_to');
        if (storedRedirect) {
            localStorage.removeItem('redirect_to');
            if (session && session.access_token) {
                // Query param ile token relay — en güvenilir yöntem
                const url = new URL(storedRedirect);
                url.searchParams.set('sso_token', session.access_token);
                url.searchParams.set('sso_refresh', session.refresh_token);
                window.location.href = url.toString();
                return;
            }
        }

        AppState.user = user;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        AppState.profile = profile || { role: 'player', permissions: {} };
        
        document.getElementById('user-name').textContent = AppState.profile.display_name || user.email;
        
        ui.renderUserBadge(user, AppState.profile, async () => {
            await supabase.auth.signOut();
            window.location.href = 'https://doruklu.com';
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
