package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Notification;
import djerbatourb.djerbatourb.entity.Role;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.NotificationRepository;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notificationRepository,
                               UtilisateurRepository utilisateurRepository,
                               SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Notify all tourists about a new service.
     */
    @Transactional
    public void notifyNewService(String serviceType, String serviceName) {
        String message = "Nouveau " + serviceType + " disponible: " + serviceName;
        
        // Find all tourists
        List<Utilisateur> tourists = utilisateurRepository.findAllByRole(Role.TOURISTE);
        
        if (tourists.isEmpty()) {
            System.err.println("⚠️ No tourists found with Role.TOURISTE! Checking database consistency...");
            List<Utilisateur> allUsers = utilisateurRepository.findAll();
            if (allUsers.isEmpty()) {
                System.err.println("❌ Database is empty of users!");
            } else {
                System.out.println("📊 Total users in DB: " + allUsers.size());
                allUsers.forEach(u -> System.out.println("   - User ID: " + u.getId() + " | Role: " + u.getRole()));
            }
        } else {
            System.out.println("👥 Found " + tourists.size() + " tourists to notify.");
        }
        
        // Create notifications for each tourist in DB
        List<Notification> notifications = tourists.stream()
                .map(u -> {
                    System.out.println("📝 Creating notification for user ID: " + u.getId());
                    return new Notification(u.getId(), message);
                })
                .collect(Collectors.toList());
        
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
            System.out.println("💾 Saved " + notifications.size() + " notifications to database.");
        }
        
        // Broadcast the notification via WebSocket to all subscribers of /topic/notifications
        System.out.println("📢 Broadcasting notification: " + message);
        messagingTemplate.convertAndSend("/topic/notifications", message);

        // Notify Admin
        notifyAdmin("📢 Site Info: " + message);
    }

    /**
     * Notify all tourists about a service update.
     */
    @Transactional
    public void notifyUpdatedService(String serviceType, String serviceName) {
        String message = "Mise à jour: Le " + serviceType + " '" + serviceName + "' a été modifié.";
        
        List<Utilisateur> tourists = utilisateurRepository.findAllByRole(Role.TOURISTE);
        
        List<Notification> notifications = tourists.stream()
                .map(u -> new Notification(u.getId(), message))
                .collect(Collectors.toList());
        
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
        
        messagingTemplate.convertAndSend("/topic/notifications", message);

        // Notify Admin
        notifyAdmin("✏️ Site Update: " + message);
    }

    /**
     * Notify specific tourists about a service deletion.
     */
    @Transactional
    public void notifyDeletedService(String serviceType, String serviceName, List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return;
        
        String message = "ALERTE: Le " + serviceType + " '" + serviceName + "' a été annulé/supprimé par le prestataire. Vos réservations sont impactées.";
        
        if (userIds == null || userIds.isEmpty()) return;
        
        List<Notification> notifications = userIds.stream()
                .distinct()
                .map(id -> new Notification(id, message))
                .collect(Collectors.toList());
        
        if (notifications != null && !notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
        
        // Notify each user via WebSocket
        for (Long userId : userIds) {
            messagingTemplate.convertAndSend("/topic/notifications/user/" + userId, message);
        }

        // Notify Admin
        notifyAdmin("⚠️ Site Alert: " + message);
    }

    /**
     * Notify a specific user about a task or event.
     */
    @Transactional
    public void sendPrivateNotification(Long userId, String message) {
        if (userId == null) return;
        
        System.out.println("📝 Creating private notification for user ID: " + userId);
        Notification notification = new Notification(userId, message);
        notificationRepository.save(notification);
        
        // Broadcast to a user-specific topic
        String topic = "/topic/notifications/user/" + userId;
        System.out.println("📢 Sending private notification to " + topic + ": " + message);
        if (message != null) {
            messagingTemplate.convertAndSend(topic, message);
        }
    }

    /**
     * Notify all admins about a site-wide event.
     */
    @Transactional
    public void notifyAdmin(String message) {
        List<Utilisateur> admins = utilisateurRepository.findAllByRole(Role.ADMIN);
        List<Notification> notifications = admins.stream()
                .map(a -> new Notification(a.getId(), message))
                .collect(Collectors.toList());
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
        // Notify admins via WebSocket
        admins.forEach(a -> messagingTemplate.convertAndSend("/topic/notifications/user/" + a.getId(), message));
    }

    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUtilisateurIdOrderByDateCreationDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUtilisateurIdAndEstLuFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        if (notificationId != null) {
            notificationRepository.findById(notificationId).ifPresent(n -> {
                n.setEstLu(true);
                notificationRepository.save(n);
            });
        }
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUtilisateurIdOrderByDateCreationDesc(userId)
                .stream().filter(n -> !n.isEstLu()).collect(Collectors.toList());
        unread.forEach(n -> n.setEstLu(true));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void deleteNotification(Long id) {
        if (id != null) {
            notificationRepository.deleteById(id);
        }
    }

    @Transactional
    public void handleGuestContact(String email, String message) {
        notifyAdmin("📩 Message de Contact (GUEST) : " + email + "\nContenu : " + message);
    }
}
