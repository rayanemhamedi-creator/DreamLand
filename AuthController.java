package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.dto.JwtResponse;
import djerbatourb.djerbatourb.dto.LoginRequest;
import djerbatourb.djerbatourb.dto.DynamicRegisterRequest;
import djerbatourb.djerbatourb.security.JwtUtils;
import djerbatourb.djerbatourb.security.UserDetailsImpl;
import djerbatourb.djerbatourb.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final AuthService authService;

    public AuthController(AuthenticationManager authenticationManager, JwtUtils jwtUtils, AuthService authService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getMotDePasse()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

         UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            String roleStr = userDetails.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");

            // Vérifier validation UNIQUEMENT pour les prestataires (jamais pour ADMIN ou TOURISTE)
            boolean isPrestataire = !roleStr.equals("ADMIN") && !roleStr.equals("TOURISTE");
            if (isPrestataire) {
                if (authService.isProviderRejected(userDetails.getId())) {
                    return ResponseEntity.status(403).body("Votre demande d'inscription a été refusée par l'administrateur.");
                }
                if (!authService.isProviderValidated(userDetails.getId(), roleStr)) {
                    return ResponseEntity.status(403).body("Votre compte est en attente de validation par l'administrateur");
                }
            }

            return ResponseEntity.ok(new JwtResponse(
                    jwt, 
                    userDetails.getId(), 
                    userDetails.getNom(), 
                    userDetails.getPrenom(), 
                    userDetails.getUsername(), 
                    userDetails.getTelephone(), 
                    roleStr
            ));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(401).body("Mot de passe ou email incorrect.");
        } catch (org.springframework.security.authentication.LockedException e) {
            return ResponseEntity.status(401).body("Votre compte est bloqué.");
        } catch (org.springframework.security.authentication.DisabledException e) {
            return ResponseEntity.status(401).body("Votre compte est désactivé.");
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Erreur d'authentification : " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody DynamicRegisterRequest signUpRequest) {
        try {
            String message = authService.registerUser(signUpRequest);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
