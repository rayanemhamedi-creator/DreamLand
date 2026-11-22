package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Message;
import djerbatourb.djerbatourb.entity.Role;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.MessageRepository;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UtilisateurRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;     // Permet d’envoyer des notifications en temps réel via WebSocket

    public MessageService(MessageRepository messageRepository, 
                          UtilisateurRepository userRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public Message envoyerMessage(Long senderId, Long receiverId, String content) {
        Utilisateur sender = userRepository.findById(senderId).orElseThrow(() -> new RuntimeException("Sender not found"));
        Utilisateur receiver = userRepository.findById(receiverId).orElseThrow(() -> new RuntimeException("Receiver not found"));

        // Determine type based on roles
        String type = "MESSAGE";
        if (sender.getRole() == Role.ADMIN || receiver.getRole() == Role.ADMIN) {
            type = "CONTACT";
        }

        Message message = new Message(sender, receiver, content, type);        // Créer le message
        Message saved = messageRepository.save(message);         // Sauvegarder en base de données

        // Notify receiver via WebSocket
        messagingTemplate.convertAndSend("/topic/messages/user/" + receiverId, saved);         // Envoyer une notification en temps réel au destinataire

        return saved;
    }

    public List<Message> getConversation(Long u1Id, Long u2Id) {
        Utilisateur u1 = userRepository.findById(u1Id).orElseThrow(() -> new RuntimeException("User not found"));
        Utilisateur u2 = userRepository.findById(u2Id).orElseThrow(() -> new RuntimeException("User not found"));
        
        List<Message> messages = messageRepository.findConversation(u1, u2);
        
        // Mark as read for the user requesting (the one who is receiver of these messages)
        // Note: This logic might need refinement depending on who calls it, 
        // but for simplicity, we mark messages received by u1 as read when u1 opens the chat.
        return messages;
    }

    @Transactional
    public void marquerCommeLu(Long receiverId, Long senderId) {
        Utilisateur receiver = userRepository.findById(receiverId).orElseThrow();
        Utilisateur sender = userRepository.findById(senderId).orElseThrow();
        List<Message> conversation = messageRepository.findConversation(receiver, sender);
        
        conversation.stream()
            .filter(m -> m.getDestinataire().getId().equals(receiverId) && !m.getEstLu())
            .forEach(m -> m.setEstLu(true));
        
        messageRepository.saveAll(conversation);
    }

    public List<Utilisateur> getInterlocuteurs(Long userId) {
        Utilisateur user = userRepository.findById(userId).orElseThrow();
        List<Message> allMessages = messageRepository.findAllByUser(user);
        
        // Extraire les interlocuteurs uniques dans l'ordre du dernier message (récent -> ancien)
        List<Utilisateur> sorted = allMessages.stream()
            .map(m -> m.getExpediteur().getId().equals(userId) ? m.getDestinataire() : m.getExpediteur())
            .distinct()
            .collect(Collectors.toCollection(ArrayList::new));

        // Placer l'admin tout en haut s'il est présent dans les discussions
        Utilisateur adminInChat = sorted.stream()
            .filter(u -> u.getRole() == Role.ADMIN)
            .findFirst()
            .orElse(null);

        if (adminInChat != null) {
            sorted.remove(adminInChat);
            sorted.add(0, adminInChat);
        }

        return sorted;
    }

    public long getNombreNonLus(Long userId) {
        Utilisateur user = userRepository.findById(userId).orElseThrow();
        return messageRepository.countByDestinataireAndEstLuFalse(user);
    }

    @Transactional
    public void supprimerMessage(Long messageId, Long userId) {
        Message m = messageRepository.findById(messageId).orElseThrow();
        if (m.getExpediteur().getId().equals(userId) || m.getDestinataire().getId().equals(userId)) {
            messageRepository.delete(m);
        }
    }

    @Transactional
    public void supprimerConversation(Long u1Id, Long u2Id) {
        Utilisateur u1 = userRepository.findById(u1Id).orElseThrow();
        Utilisateur u2 = userRepository.findById(u2Id).orElseThrow();
        messageRepository.deleteConversation(u1, u2);
    }
}
