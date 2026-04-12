import { supabase, AppState } from 'https://cdn.doruklu.com/supabase-config.js';
import { ui } from 'https://cdn.doruklu.com/ui.js';
import { initAdminPanel, loadUserLinks, initCardManager } from './app.js';

export async function initAuth() {    
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect_to');
    if (redirectTo) {
        localStorage.setItem('redirect_to', redirectTo);
    }

    let _handled = false;

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
            if (!AppState.user) {
                ui.showScreen('auth-screen');
            }
        }, 500);
    }

    document.getElementById('google-btn').addEventListener('click', handleGoogleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    async function handleLoginSuccess(user, session) {
        if (AppState.user) return;

        // Redirect bekleyen subdomain varsa yönlendir
        const storedRedirect = localStorage.getItem('redirect_to');
        if (storedRedirect) {
            localStorage.removeItem('redirect_to');
            // Session zaten cookie'de paylaşıldığı için token eklemeye gerek yok
            window.location.href = storedRedirect;
            return;
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
