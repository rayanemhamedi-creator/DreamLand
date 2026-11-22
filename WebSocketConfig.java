package djerbatourb.djerbatourb.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple memory-based message broker to send messages to the client
        // on destinations prefixed with /topic
        config.enableSimpleBroker("/topic");
        
        // Define the prefix for messages that are bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the /ws endpoint, enabling the SockJS fallback options so that alternate 
        // transports can be used if WebSockets are not available
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://*", "https://*", "http://*:[*]", "https://*:[*]")
                .withSockJS();
    }
}
