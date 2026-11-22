package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Avis;
import djerbatourb.djerbatourb.entity.Role;
import djerbatourb.djerbatourb.entity.TypeService;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.AvisRepository;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AvisService {

    @Autowired
    private AvisRepository avisRepository;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    public Avis ajouterAvis(Avis avis) {
        // Vérifier si l'utilisateur existe et est un touriste
        Utilisateur user = utilisateurRepository.findById(avis.getIdUtilisateur())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user.getRole() != Role.TOURISTE) {
            throw new RuntimeException("Seuls les touristes peuvent donner un avis");
        }

        // Si l'avis existe déjà, on fait un UPDATE (Upsert)
        java.util.Optional<Avis> existing = avisRepository.findByIdUtilisateurAndIdServiceAndTypeService(
                avis.getIdUtilisateur(), avis.getIdService(), avis.getTypeService());

        if (existing.isPresent()) {
            Avis existingAvis = existing.get();
            existingAvis.setScore(avis.getScore());
            existingAvis.setDateCreation(java.time.LocalDateTime.now());
            return avisRepository.save(existingAvis);
        }

        return avisRepository.save(avis);
    }

    public java.util.Optional<Avis> getAvisUtilisateur(Long idUtilisateur, TypeService typeService, Long idService) {
        return avisRepository.findByIdUtilisateurAndIdServiceAndTypeService(idUtilisateur, idService, typeService);
    }

    public List<Avis> getAvisParService(TypeService type, Long idService) {
        return avisRepository.findByTypeServiceAndIdService(type, idService);
    }

    public Map<String, Object> getMoyenneAvis(TypeService type, Long idService) {
        List<Avis> avisList = avisRepository.findByTypeServiceAndIdService(type, idService);
        
        int totalAvis = avisList.size();
        double moyenne = 0;

        if (totalAvis > 0) {
            // Normalisation des anciens scores (25-100) en échelle (1-5) pour un calcul de moyenne juste
            double somme = avisList.stream()
                    .mapToDouble(a -> {
                        int s = a.getScore();
                        if (s > 5) {
                            if (s >= 95) return 5.0;
                            if (s >= 70) return 4.0;
                            if (s >= 45) return 3.0;
                            return 2.0; // Par défaut pour 25/50 restants
                        }
                        return (double) s;
                    })
                    .sum();
            moyenne = somme / totalAvis;
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("pourcentageMoyenne", (moyenne / 5.0) * 100.0);
        stats.put("nombreTotalAvis", totalAvis);
        
        return stats;
    }

    public Map<String, Object> getAllMoyennes() {
        List<Avis> allAvis = avisRepository.findAll();

        // Group by "TYPESERVICE_idService" key
        Map<String, List<Avis>> grouped = new HashMap<>();
        for (Avis avis : allAvis) {
            String key = avis.getTypeService().name() + "_" + avis.getIdService();
            grouped.computeIfAbsent(key, k -> new java.util.ArrayList<>()).add(avis);
        }

        // Build the result map: key -> {pourcentageMoyenne, nombreTotalAvis}
        Map<String, Object> result = new HashMap<>();
        for (Map.Entry<String, List<Avis>> entry : grouped.entrySet()) {
            List<Avis> avisList = entry.getValue();
            int totalAvis = avisList.size();
            double somme = avisList.stream()
                    .mapToDouble(a -> {
                        int s = a.getScore();
                        if (s > 5) {
                            if (s >= 95) return 5.0;
                            if (s >= 70) return 4.0;
                            if (s >= 45) return 3.0;
                            return 2.0;
                        }
                        return (double) s;
                    })
                    .sum();
            double moyenne = somme / totalAvis;

            Map<String, Object> stats = new HashMap<>();
            stats.put("pourcentageMoyenne", (moyenne / 5.0) * 100.0);
            stats.put("nombreTotalAvis", totalAvis);
            result.put(entry.getKey(), stats);
        }

        return result;
    }
}
