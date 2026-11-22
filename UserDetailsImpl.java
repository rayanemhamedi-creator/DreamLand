package djerbatourb.djerbatourb.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import djerbatourb.djerbatourb.entity.Utilisateur;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.List;

public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    @JsonIgnore
    private String password;
    private Boolean isBlocked;
    private Boolean validated;
    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Long id, String nom, String prenom, String email, String telephone, String password, Boolean isBlocked, Boolean validated, Collection<? extends GrantedAuthority> authorities) {
        this.id = id; this.nom = nom; this.prenom = prenom; this.email = email; this.telephone = telephone; this.password = password; this.isBlocked = isBlocked; this.validated = validated; this.authorities = authorities;
    }

    public static UserDetailsImpl build(Utilisateur user) {
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        
        String nom = user.getNom() != null ? user.getNom() : "";
        String prenom = user.getPrenom() != null ? user.getPrenom() : "";
        boolean isValidated = true; // Validation status will be verified by AuthController via AuthService if needed


        return new UserDetailsImpl(
            user.getId(), nom, prenom, user.getEmail(), user.getTelephone(), user.getMotDePasse(), 
            (user.getEstBloque() != null && user.getEstBloque()), 
            isValidated,
            authorities);
    }

    public Boolean getValidated() { return validated; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    public Long getId() { return id; }
    public String getNom() { return nom; }
    public String getPrenom() { return prenom; }
    public String getTelephone() { return telephone; }
    @Override public String getPassword() { return password; }
    @Override public String getUsername() { return email; } // L'email sert d'identifiant principal
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return !isBlocked; } // Gestion du compte bloqué Nativement
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
