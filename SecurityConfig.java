package djerbatourb.djerbatourb.config;

import djerbatourb.djerbatourb.security.AuthEntryPointJwt;
import djerbatourb.djerbatourb.security.AuthTokenFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private final AuthEntryPointJwt unauthorizedHandler;
    private final AuthTokenFilter authTokenFilter;

    public SecurityConfig(AuthEntryPointJwt unauthorizedHandler, AuthTokenFilter authTokenFilter) {
        this.unauthorizedHandler = unauthorizedHandler; this.authTokenFilter = authTokenFilter;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> 
                auth.requestMatchers("/api/guides", "/api/guides/**").permitAll()
                    .requestMatchers("/api/sorties", "/api/sorties/**").permitAll()
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers("/api/auth/**", "/error").permitAll()
                    .requestMatchers("/api/chambres", "/api/chambres/**").permitAll()
                    .requestMatchers("/api/hotels", "/api/hotels/**").permitAll()
                    .requestMatchers("/api/restaurants", "/api/restaurants/**").permitAll()
                    .requestMatchers("/api/tables-resto", "/api/tables-resto/**").permitAll()
                    .requestMatchers("/api/cinemas", "/api/cinemas/**").permitAll()
                    .requestMatchers("/api/films", "/api/films/**").permitAll()
                    .requestMatchers("/api/evenements", "/api/evenements/**").permitAll()
                    .requestMatchers("/api/sports", "/api/sports/**").permitAll()
                    .requestMatchers("/api/reservation-sports", "/api/reservation-sports/**").permitAll()
                    .requestMatchers("/api/materiel-sports", "/api/materiel-sports/**").permitAll()
                    .requestMatchers("/ws/**").permitAll()
                    .requestMatchers("/api/notifications/**").permitAll()
                    .requestMatchers("/api/utilisateurs/public-stats").permitAll()
                    .requestMatchers("/api/utilisateurs/*/etablissement").permitAll()
                    .requestMatchers("/api/menus/restaurant/**").permitAll()
                    .requestMatchers("/api/chatbot/**").permitAll()
                    .requestMatchers("/api/payments/webhook").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/avis/**").permitAll()
                    .requestMatchers("/api/payments/**").authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/avis").authenticated()

                    .anyRequest().authenticated()
            );

        http.addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://*:[*]",
            "https://*:[*]",
            "http://*",
            "https://*"
        )); 
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(Arrays.asList("*")); // Autorise TOUS les headers
        config.setAllowCredentials(true);
        config.setExposedHeaders(Arrays.asList("Authorization")); // Indispensable pour voir le token
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
