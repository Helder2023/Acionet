
document.addEventListener('DOMContentLoaded', function() {
    // =============================================
    // DROPDOWNS
    // =============================================
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function(e) {
            // Não fecha se clicar em item de notificação
            if (e.target.closest('.notification-item')) {
                return;
            }
            
            e.stopPropagation();
            // Fecha outros dropdowns abertos
            dropdowns.forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            // Alterna o dropdown atual
            this.classList.toggle('show');
        });
    });
    
    // Fecha dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(d => d.classList.remove('show'));
        }
    });

    // =============================================
    // REDIRECIONAMENTO NAS NOTIFICAÇÕES DO DROPDOWN
    // =============================================
    const dropdownNotifications = document.querySelectorAll('.notification-item');
    
    dropdownNotifications.forEach(notification => {
        notification.addEventListener('click', function(e) {
            e.stopPropagation(); // Não fecha o dropdown imediatamente
            
            const url = this.getAttribute('data-url');
            
            if (url) {
                // Marca como lida
                this.classList.remove('unread');
                this.classList.add('read');
                const statusDot = this.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.classList.remove('unread');
                    statusDot.classList.add('read');
                }
                
                // Atualiza contador
                updateNotificationCount();
                
                // Efeito visual de clique
                this.style.transform = 'scale(0.98)';
                this.style.opacity = '0.8';
                
                // Redireciona
                setTimeout(() => {
                    window.location.href = url;
                }, 200);
            }
        });
        
        // Efeito hover - cursor pointer
        notification.style.cursor = 'pointer';
    });

    // =============================================
    // MODAL DE NOTIFICAÇÕES
    // =============================================
    const notificationsModal = document.getElementById('notificationsModal');
    const closeModalBtn = document.getElementById('closeNotificationsModal');
    const viewAllLink = document.getElementById('viewAllNotifications');
    
    // Abrir Modal ao clicar em "Ver todas"
    if (viewAllLink) {
        viewAllLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        });
    }
    
    // Função para abrir o modal
    function openModal() {
        if (notificationsModal) {
            notificationsModal.classList.add('show');
            dropdowns.forEach(d => d.classList.remove('show'));
            document.body.style.overflow = 'hidden';
            
            // Sincroniza o estado das notificações entre dropdown e modal
            syncNotificationStates();
        }
    }
    
    // Função para fechar o modal
    function closeModal() {
        if (notificationsModal) {
            notificationsModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    // Sincronizar estado das notificações
    function syncNotificationStates() {
        dropdownNotifications.forEach(dropdownNotif => {
            const url = dropdownNotif.getAttribute('data-url');
            const isRead = dropdownNotif.classList.contains('read');
            
            // Procura a notificação correspondente no modal
            const modalNotifs = document.querySelectorAll('.modal-notification-item');
            modalNotifs.forEach(modalNotif => {
                if (modalNotif.getAttribute('data-url') === url) {
                    if (isRead) {
                        modalNotif.classList.remove('unread');
                        modalNotif.classList.add('read');
                        const statusDot = modalNotif.querySelector('.status-dot');
                        if (statusDot) {
                            statusDot.classList.remove('unread');
                            statusDot.classList.add('read');
                        }
                    }
                }
            });
        });
    }
    
    // Fechar Modal pelo botão X
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    // Fechar Modal ao clicar fora
    if (notificationsModal) {
        notificationsModal.addEventListener('click', function(e) {
            if (e.target === notificationsModal) {
                closeModal();
            }
        });
    }
    
    // Fechar Modal com tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && notificationsModal && notificationsModal.classList.contains('show')) {
            closeModal();
        }
    });

    // =============================================
    // CLICAR NA NOTIFICAÇÃO DO MODAL - REDIRECIONAR
    // =============================================
    const modalNotificationItems = document.querySelectorAll('.modal-notification-item');
    
    modalNotificationItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Não redireciona se clicar nos botões de ação
            if (e.target.closest('.btn-action') || 
                e.target.closest('.notification-actions') ||
                e.target.closest('.notification-status')) {
                return;
            }
            
            const url = this.getAttribute('data-url');
            
            if (url) {
                // Marca como lida antes de redirecionar
                this.classList.remove('unread');
                this.classList.add('read');
                const statusDot = this.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.classList.remove('unread');
                    statusDot.classList.add('read');
                }
                
                // Sincroniza com dropdown
                syncDropdownFromModal(this);
                
                // Atualiza contador
                updateNotificationCount();
                
                // Efeito visual de clique
                this.style.transform = 'scale(0.98)';
                
                // Redireciona após pequeno delay para o efeito
                setTimeout(() => {
                    window.location.href = url;
                }, 200);
            }
        });
        
        item.style.cursor = 'pointer';
    });
    
    // Sincronizar dropdown quando marcar como lida no modal
    function syncDropdownFromModal(modalItem) {
        const url = modalItem.getAttribute('data-url');
        
        dropdownNotifications.forEach(dropdownNotif => {
            if (dropdownNotif.getAttribute('data-url') === url) {
                dropdownNotif.classList.remove('unread');
                dropdownNotif.classList.add('read');
                const statusDot = dropdownNotif.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.classList.remove('unread');
                    statusDot.classList.add('read');
                }
            }
        });
    }

    // =============================================
    // FILTROS DO MODAL
    // =============================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    const notificationItems = document.querySelectorAll('.modal-notification-item');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active de todos
            filterBtns.forEach(b => b.classList.remove('active'));
            // Adiciona active no clicado
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            
            notificationItems.forEach(item => {
                if (filter === 'all') {
                    item.style.display = 'flex';
                } else if (filter === 'unread') {
                    item.style.display = item.classList.contains('unread') ? 'flex' : 'none';
                } else {
                    item.style.display = item.getAttribute('data-type') === filter ? 'flex' : 'none';
                }
            });
        });
    });

    // =============================================
    // MARCAR TODAS COMO LIDAS
    // =============================================
    const markAllReadBtn = document.querySelector('.btn-mark-all-read');
    
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function() {
            // Marcar todas no modal
            notificationItems.forEach(item => {
                item.classList.remove('unread');
                item.classList.add('read');
                const statusDot = item.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.classList.remove('unread');
                    statusDot.classList.add('read');
                }
            });
            
            // Marcar todas no dropdown
            dropdownNotifications.forEach(item => {
                item.classList.remove('unread');
                item.classList.add('read');
                const statusDot = item.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.classList.remove('unread');
                    statusDot.classList.add('read');
                }
            });
            
            // Atualizar contador
            updateNotificationCount();
            
            // Feedback visual
            const originalText = this.textContent;
            this.textContent = '✓ Todas marcadas como lidas';
            this.style.backgroundColor = 'var(--success-color, #27ae60)';
            this.style.color = 'white';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.backgroundColor = '';
                this.style.color = '';
            }, 2000);
        });
    }

    // =============================================
    // AÇÕES DOS BOTÕES (Aprovar, Recusar, Responder)
    // =============================================
    
    // APROVAR
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const item = this.closest('.modal-notification-item');
            const id = item.getAttribute('data-url').split('id=')[1];
            
            console.log(`Aprovando solicitação #${id}`);
            
            // Marca como lida
            item.classList.remove('unread');
            item.classList.add('read');
            const statusDot = item.querySelector('.status-dot');
            if (statusDot) {
                statusDot.classList.remove('unread');
                statusDot.classList.add('read');
            }
            
            // Feedback visual
            this.textContent = '✓ Aprovado';
            this.style.backgroundColor = 'var(--success-color, #27ae60)';
            this.style.color = 'white';
            this.style.borderColor = 'var(--success-color, #27ae60)';
            this.disabled = true;
            
            const rejectBtn = item.querySelector('.btn-reject');
            if (rejectBtn) rejectBtn.style.display = 'none';
            
            const strongText = item.querySelector('.notification-header strong');
            if (strongText) {
                strongText.textContent = `Solicitação #${id} - Aprovada`;
            }
            
            // Sincroniza com dropdown
            syncDropdownFromModal(item);
            updateNotificationCount();
        });
    });

    // RECUSAR
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const item = this.closest('.modal-notification-item');
            const id = item.getAttribute('data-url').split('id=')[1];
            
            console.log(`Recusando solicitação #${id}`);
            
            item.classList.remove('unread');
            item.classList.add('read');
            const statusDot = item.querySelector('.status-dot');
            if (statusDot) {
                statusDot.classList.remove('unread');
                statusDot.classList.add('read');
            }
            
            this.textContent = '✗ Recusado';
            this.style.backgroundColor = 'var(--danger-color, #e74c3c)';
            this.style.color = 'white';
            this.style.borderColor = 'var(--danger-color, #e74c3c)';
            this.disabled = true;
            
            const approveBtn = item.querySelector('.btn-approve');
            if (approveBtn) approveBtn.style.display = 'none';
            
            const strongText = item.querySelector('.notification-header strong');
            if (strongText) {
                strongText.textContent = `Solicitação #${id} - Recusada`;
            }
            
            syncDropdownFromModal(item);
            updateNotificationCount();
        });
    });

    // RESPONDER
    document.querySelectorAll('.btn-reply').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const item = this.closest('.modal-notification-item');
            const url = item.getAttribute('data-url');
            
            item.classList.remove('unread');
            item.classList.add('read');
            const statusDot = item.querySelector('.status-dot');
            if (statusDot) {
                statusDot.classList.remove('unread');
                statusDot.classList.add('read');
            }
            
            this.textContent = 'Abrindo...';
            this.style.backgroundColor = 'var(--primary-color, #3498db)';
            this.style.color = 'white';
            this.style.borderColor = 'var(--primary-color, #3498db)';
            
            syncDropdownFromModal(item);
            updateNotificationCount();
            
            if (url) {
                setTimeout(() => {
                    window.location.href = url;
                }, 300);
            }
        });
    });

    // =============================================
    // ATUALIZAR CONTADOR DE NOTIFICAÇÕES
    // =============================================
    function updateNotificationCount() {
        const unreadDropdown = document.querySelectorAll('.notification-item.unread').length;
        const badge = document.querySelector('.notification-badge');
        const dropdownSmall = document.querySelector('.dropdown-header small');
        
        if (badge) {
            if (unreadDropdown > 0) {
                badge.textContent = unreadDropdown;
                badge.style.display = 'flex';
            } else {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        }
        
        if (dropdownSmall) {
            dropdownSmall.textContent = `${unreadDropdown} novas`;
        }
    }

    // Atualizar contador inicial
    updateNotificationCount();
});








    document.addEventListener('DOMContentLoaded', function() {
        // =============================================
        // SIDEBAR RESPONSIVO - MENU HAMBÚRGUER
        // =============================================
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        const mainContent = document.querySelector('.main-content');
        
        // Criar overlay para quando o sidebar estiver aberto no mobile
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        `;
        document.body.appendChild(overlay);
        
        // Detectar se é mobile
        function isMobile() {
            return window.innerWidth <= 1024;
        }
        
        // Função para abrir sidebar
        function openSidebar() {
            sidebar.classList.add('sidebar-open');
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
            document.body.style.overflow = 'hidden';
            
            // Efeito no botão hambúrguer
            menuToggle.classList.add('active');
            
            // Animar os itens do menu
            const navItems = sidebar.querySelectorAll('.nav-item');
            navItems.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                item.style.transition = `all 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s`;
                
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                }, 100);
            });
        }
        
        // Função para fechar sidebar
        function closeSidebar() {
            sidebar.classList.remove('sidebar-open');
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            document.body.style.overflow = '';
            
            menuToggle.classList.remove('active');
            
            // Resetar animações dos itens
            const navItems = sidebar.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.style.opacity = '';
                item.style.transform = '';
                item.style.transition = '';
            });
        }
        
        // Toggle sidebar ao clicar no hambúrguer
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (isMobile()) {
                if (sidebar.classList.contains('sidebar-open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            } else {
                // Em desktop, alterna sidebar colapsado
                sidebar.classList.toggle('sidebar-collapsed');
                mainContent.classList.toggle('expanded');
                
                // Salvar preferência
                const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed);
            }
        });
        
        // Fechar sidebar ao clicar no overlay
        overlay.addEventListener('click', closeSidebar);
        
        // Fechar sidebar ao clicar em um link (mobile)
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                if (isMobile() && sidebar.classList.contains('sidebar-open')) {
                    // Pequeno delay para dar efeito visual
                    setTimeout(closeSidebar, 200);
                }
            });
        });
        
        // Fechar sidebar com tecla ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                closeSidebar();
            }
        });
        
        // Ajustar ao redimensionar a tela
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (!isMobile()) {
                    // Se voltar para desktop, fecha o overlay
                    closeSidebar();
                    
                    // Restaura estado salvo
                    const savedState = localStorage.getItem('sidebarCollapsed');
                    if (savedState === 'true') {
                        sidebar.classList.add('sidebar-collapsed');
                        mainContent.classList.add('expanded');
                    }
                } else {
                    // Remove colapso em mobile
                    sidebar.classList.remove('sidebar-collapsed');
                    mainContent.classList.remove('expanded');
                }
            }, 250);
        });
        
        // =============================================
        // INICIALIZAÇÃO
        // =============================================
        function initSidebar() {
            if (!isMobile()) {
                // Restaura estado salvo em desktop
                const savedState = localStorage.getItem('sidebarCollapsed');
                if (savedState === 'true') {
                    sidebar.classList.add('sidebar-collapsed');
                    mainContent.classList.add('expanded');
                }
            }
            
            // Garantir que o overlay esteja fechado ao carregar
            closeSidebar();
        }
        
        initSidebar();
        
        // =============================================
        // MELHORIAS VISUAIS DO BOTÃO HAMBÚRGUER
        // =============================================
        
        // Adicionar estilo inline para animação do hambúrguer
        const style = document.createElement('style');
        style.textContent = `
            /* Animação do botão hambúrguer */
            .menu-toggle {
                position: relative;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .menu-toggle:hover {
                transform: scale(1.05);
            }
            
            .menu-toggle:active {
                transform: scale(0.95);
            }
            
            .menu-toggle.active {
                background: rgba(74, 144, 226, 0.15);
                border-color: rgba(74, 144, 226, 0.3);
            }
            
            .menu-toggle.active i {
                transform: rotate(90deg);
            }
            
            .menu-toggle i {
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Sidebar Overlay */
            .sidebar-overlay {
                display: none;
            }
            
            @media (max-width: 1024px) {
                .sidebar-overlay {
                    display: block;
                }
            }
            
            /* Sidebar Mobile - Estilos Dinâmicos */
            @media (max-width: 1024px) {
                .sidebar {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    height: 100vh !important;
                    width: 280px !important;
                    z-index: 1000 !important;
                    transform: translateX(-100%) !important;
                    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    box-shadow: none !important;
                }
                
                .sidebar.sidebar-open {
                    transform: translateX(0) !important;
                    box-shadow: 4px 0 30px rgba(0, 0, 0, 0.15) !important;
                }
                
                .sidebar:not(.sidebar-open) {
                    transform: translateX(-100%) !important;
                }
                
                /* Empurrar conteúdo principal ao abrir sidebar */
                .main-content {
                    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                .main-content.sidebar-pushed {
                    transform: translateX(280px) !important;
                }
            }
            
            /* Sidebar Collapsed (Desktop) */
            @media (min-width: 1025px) {
                .sidebar.sidebar-collapsed {
                    width: 70px !important;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                .sidebar.sidebar-collapsed .sidebar-logo,
                .sidebar.sidebar-collapsed .sidebar-version,
                .sidebar.sidebar-collapsed .nav-section,
                .sidebar.sidebar-collapsed .nav-link span,
                .sidebar.sidebar-collapsed .notification-badge {
                    display: none !important;
                }
                
                .sidebar.sidebar-collapsed .nav-link {
                    justify-content: center !important;
                    padding: 12px !important;
                }
                
                .sidebar.sidebar-collapsed .nav-link i {
                    margin-right: 0 !important;
                    font-size: 1.3rem !important;
                }
                
                .sidebar.sidebar-collapsed .sidebar-header {
                    justify-content: center !important;
                    padding: 20px 10px !important;
                }
                
                .sidebar.sidebar-collapsed .sidebar-header img {
                    margin: 0 auto !important;
                }
                
                .main-content.expanded {
                    margin-left: 70px !important;
                    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
            }
            
            /* Efeito de ripple no hover dos links mobile */
            @media (max-width: 1024px) {
                .nav-item {
                    position: relative;
                    overflow: hidden;
                }
                
                .nav-item::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 3px;
                    height: 100%;
                    background: linear-gradient(180deg, #4a90e2, #6ea8fe);
                    transform: scaleY(0);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 0 3px 3px 0;
                }
                
                .nav-item:hover::after {
                    transform: scaleY(1);
                }
                
                .nav-link.active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 3px;
                    height: 100%;
                    background: linear-gradient(180deg, #4a90e2, #6ea8fe);
                    border-radius: 0 3px 3px 0;
                }
            }
            
            /* Efeito de vidro no sidebar mobile */
            @media (max-width: 1024px) {
                .sidebar {
                    background: var(--sidebar-bg, #ffffff) !important;
                    backdrop-filter: blur(20px) !important;
                    -webkit-backdrop-filter: blur(20px) !important;
                }
                
                [data-theme="dark"] .sidebar {
                    background: var(--sidebar-bg, #1a1a2e) !important;
                    backdrop-filter: blur(20px) !important;
                    -webkit-backdrop-filter: blur(20px) !important;
                }
            }
        `;
        document.head.appendChild(style);
        
        // =============================================
        // EFEITO PUSH NO CONTEÚDO PRINCIPAL (MOBILE)
        // =============================================
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.target === sidebar && mutation.attributeName === 'class') {
                    if (isMobile()) {
                        const mainContent = document.querySelector('.main-content');
                        if (sidebar.classList.contains('sidebar-open')) {
                            mainContent.classList.add('sidebar-pushed');
                        } else {
                            mainContent.classList.remove('sidebar-pushed');
                        }
                    }
                }
            });
        });
        
        observer.observe(sidebar, { attributes: true });
        
        // =============================================
        // ESTADO ATIVO DO LINK ATUAL
        // =============================================
        const currentPath = window.location.pathname;
        const navLinks = sidebar.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && currentPath.includes(href.split('/').pop())) {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
        
        console.log('🚀 Sistema de Navegação Responsiva Ativado - ACIONET Control Center');
    });








    // Remove loading após carregamento
window.addEventListener("load", () => {
    const loader = document.getElementById("loadingScreen");

    setTimeout(() => {
        loader.classList.add("hide");

        setTimeout(() => {
            loader.style.display = "none";
        }, 600);

    }, 2500); // tempo simulado de loading
});