package djerbatourb.djerbatourb.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.util.StringUtils;
import org.springframework.lang.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;

// Filtre de sécurité personnalisable qui s'assure d'intercepter chaque requête HTTP (une seule fois par requête)
// afin de vérifier la présence et la validité du Token JWT fourni par l'application client.
@Component
public class AuthTokenFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    // Composant utilitaire utilisé pour la manipulation et la validation logiques des jetons JWT
    private final JwtUtils jwtUtils;
    
    // Service permettant de récupérer le profil complet de l'utilisateur depuis la base de données
    private final UserDetailsServiceImpl userDetailsService;

    // Injection des dépendances par le constructeur
    public AuthTokenFilter(JwtUtils jwtUtils, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtils = jwtUtils; 
        this.userDetailsService = userDetailsService;
    }

    // Méthode principale du filtre, exécutée à chaque requête reçue par le serveur back-end
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, 
                                    @NonNull HttpServletResponse response, 
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 1. Extraction du jeton JWT présent dans l'en-tête (Header) de la requête envoyée
            String jwt = parseJwt(request);
            
            // 2. Si un token a bien été fourni et qu'il est jugé valide par notre composant de vérification
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                
                // On récupère le mail (ou le nom d'utilisateur) crypté mais lisible placé à l'intérieur du payload du token
                String email = jwtUtils.getUserNameFromJwtToken(jwt);
                
                // On interroge la logique métier pour re-construire les détails (rôles, statut) associés à ce profil utilisateur
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                
                // À partir de ces détails, on crée un container (objet d'authentification) valide pour Spring Security
                // Ce container inclut notamment les permissions/droits stricts (authorities) accordés à l'utilisateur
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                
                // On enrichit l'objet d'authentification avec des détails de connexion (identifiants de requête web en cours, IP locale, session)
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                // 3. Étape finale : On place officiellement cet utilisateur formel dans le contexte de sécurité global du serveur.
                // Dès ce point, et jusqu'à la fin de la requête, l'utilisateur a ses accès autorisés.
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) { 
            // Si une anomalie ou corruption survient pendant l'authentification réseau, on écrit un log formel
            // mais ce Catch ne bloque pas le retour frontal, Spring gérera le rejet aux prochains barrages.
            logger.debug("Impossible de définir l'authentification : {}", e.getMessage()); 
        }
        
        // Poursuite de la chaîne (vers le prochain filtre ou pour déclencher le Controller demandé si c'était le dernier).
        filterChain.doFilter(request, response);
    }

    // Méthode d'aide pour n'extraire que le jeton chiffré brut depuis toute la valeur formelle de l'en-tête 'Authorization'
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        
        // Les normes générales d'authentification JWT imposent la convention "Bearer <token>" 
        // On vérifie que la chaîne commence bien ainsi avant d'isoler en enlevant ces 7 premiers caractères
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7); // Supprime "Bearer " au début de la string (7 char)
        }
        return null;
    }
}
