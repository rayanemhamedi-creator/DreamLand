package djerbatourb.djerbatourb.dto;

import java.util.List;

public class ChatbotRequest {
    private String isFirstVisit;
    private String hasAccommodation;
    private Integer days;
    private String budget;
    private List<String> preferences;
    private String travelType;
    private String needGuide;
    private String needResto;
    private boolean regenerate;

    // Getters and Setters
    public String getIsFirstVisit() { return isFirstVisit; }
    public void setIsFirstVisit(String isFirstVisit) { this.isFirstVisit = isFirstVisit; }

    public String getHasAccommodation() { return hasAccommodation; }
    public void setHasAccommodation(String hasAccommodation) { this.hasAccommodation = hasAccommodation; }

    public Integer getDays() { return days; }
    public void setDays(Integer days) { this.days = days; }

    public String getBudget() { return budget; }
    public void setBudget(String budget) { this.budget = budget; }

    public List<String> getPreferences() { return preferences; }
    public void setPreferences(List<String> preferences) { this.preferences = preferences; }

    public String getTravelType() { return travelType; }
    public void setTravelType(String travelType) { this.travelType = travelType; }

    public String getNeedGuide() { return needGuide; }
    public void setNeedGuide(String needGuide) { this.needGuide = needGuide; }

    public String getNeedResto() { return needResto; }
    public void setNeedResto(String needResto) { this.needResto = needResto; }

    public boolean isRegenerate() { return regenerate; }
    public void setRegenerate(boolean regenerate) { this.regenerate = regenerate; }
}
