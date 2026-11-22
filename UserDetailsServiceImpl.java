package djerbatourb.djerbatourb.security;

import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private final UtilisateurRepository userRepository;
    public UserDetailsServiceImpl(UtilisateurRepository userRepository) { this.userRepository = userRepository; }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Utilisateur user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Email introuvable : " + email));
        return UserDetailsImpl.build(user);
    }
}
