package djerbatourb.djerbatourb.service;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PriceService {

    public static final RoundingMode DEFAULT_ROUNDING = RoundingMode.HALF_UP;
    public static final int DEFAULT_SCALE = 2;

    /**
     * Multiplies a value by a factor and returns a scaled BigDecimal.
     */
    public BigDecimal multiply(BigDecimal value, double factor) {
        if (value == null) return BigDecimal.ZERO;
        return value.multiply(BigDecimal.valueOf(factor))
                   .setScale(DEFAULT_SCALE, DEFAULT_ROUNDING);
    }

    /**
     * Multiplies two BigDecimals and returns a scaled result.
     */
    public BigDecimal multiply(BigDecimal value, BigDecimal factor) {
        if (value == null || factor == null) return BigDecimal.ZERO;
        return value.multiply(factor)
                   .setScale(DEFAULT_SCALE, DEFAULT_ROUNDING);
    }

    /**
     * Helper to safely convert Double to BigDecimal with scale.
     */
    public BigDecimal toBigDecimal(Double value) {
        if (value == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(value).setScale(DEFAULT_SCALE, DEFAULT_ROUNDING);
    }
    
    /**
     * Generic addition.
     */
    public BigDecimal add(BigDecimal... values) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal v : values) {
            if (v != null) {
                total = total.add(v);
            }
        }
        return total.setScale(DEFAULT_SCALE, DEFAULT_ROUNDING);
    }
}
