/**
 * Doruklu Ana Portal — Auth Modülü
 * Artık tüm mantık CDN/auth.js üzerindeki initPlatformAuth tarafından yürütülüyor.
 */
import { initPlatformAuth } from 'https://cdn.doruklu.com/auth.js';
import { ui } from 'https://cdn.doruklu.com/ui.js';
import { initAdminPanel, loadUserLinks } from './app.js';

export async function initAuth() {
    console.log("Doruklu Hub Auth Initializing (CDN Unified Mode)");

    await initPlatformAuth({
        isHub: true,
        onSuccess: (user, profile) => {
            // Hub'a özel UI işlemleri
            ui.renderGlobalHeader("Portalı");
            ui.showScreen('dashboard-screen');
            
            // Yönetici erişimi
            if (profile.role === 'super_admin' || profile.role === 'admin') {
                document.getElementById('admin-quick-access').style.display = 'block';
                initAdminPanel();
            } else {
                document.getElementById('admin-quick-access').style.display = 'none';
            }

            // Linkleri yükle
            loadUserLinks();
        }
    });
}
