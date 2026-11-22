package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Message;
import djerbatourb.djerbatourb.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    
    // Find all messages involving a user (either as sender or receiver)
    @Query("SELECT m FROM Message m WHERE m.expediteur = :user OR m.destinataire = :user ORDER BY m.dateEnvoi DESC")
    List<Message> findAllByUser(@Param("user") Utilisateur user);

    // Find conversation between two specific users
    @Query("SELECT m FROM Message m WHERE (m.expediteur = :u1 AND m.destinataire = :u2) OR (m.expediteur = :u2 AND m.destinataire = :u1) ORDER BY m.dateEnvoi ASC")
    List<Message> findConversation(@Param("u1") Utilisateur u1, @Param("u2") Utilisateur u2);

    // Count unread messages for a user
    long countByDestinataireAndEstLuFalse(Utilisateur destinataire);

    // Find distinct interlocutors for a user
    @Query("SELECT DISTINCT m.expediteur FROM Message m WHERE m.destinataire = :user UNION SELECT DISTINCT m.destinataire FROM Message m WHERE m.expediteur = :user")
    List<Utilisateur> findInterlocutors(@Param("user") Utilisateur user);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("DELETE FROM Message m WHERE (m.expediteur = :u1 AND m.destinataire = :u2) OR (m.expediteur = :u2 AND m.destinataire = :u1)")
    void deleteConversation(@Param("u1") Utilisateur u1, @Param("u2") Utilisateur u2);
}
