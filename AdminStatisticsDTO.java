package djerbatourb.djerbatourb.dto;

public class AdminStatisticsDTO {
    private long totalUsers;
    private long totalTouristes;
    private long totalPrestataires;
    private double totalRevenu;
    private double totalCommissions;

    // Per-role provider counts
    private long totalHotels;
    private long totalRestaurants;
    private long totalCafes;
    private long totalCinemas;
    private long totalSports;
    private long totalGuides;

    public AdminStatisticsDTO() {}

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getTotalTouristes() { return totalTouristes; }
    public void setTotalTouristes(long totalTouristes) { this.totalTouristes = totalTouristes; }

    public long getTotalPrestataires() { return totalPrestataires; }
    public void setTotalPrestataires(long totalPrestataires) { this.totalPrestataires = totalPrestataires; }

    public double getTotalRevenu() { return totalRevenu; }
    public void setTotalRevenu(double totalRevenu) { this.totalRevenu = totalRevenu; }

    public double getTotalCommissions() { return totalCommissions; }
    public void setTotalCommissions(double totalCommissions) { this.totalCommissions = totalCommissions; }

    public long getTotalHotels() { return totalHotels; }
    public void setTotalHotels(long totalHotels) { this.totalHotels = totalHotels; }

    public long getTotalRestaurants() { return totalRestaurants; }
    public void setTotalRestaurants(long totalRestaurants) { this.totalRestaurants = totalRestaurants; }

    public long getTotalCafes() { return totalCafes; }
    public void setTotalCafes(long totalCafes) { this.totalCafes = totalCafes; }

    public long getTotalCinemas() { return totalCinemas; }
    public void setTotalCinemas(long totalCinemas) { this.totalCinemas = totalCinemas; }

    public long getTotalSports() { return totalSports; }
    public void setTotalSports(long totalSports) { this.totalSports = totalSports; }

    public long getTotalGuides() { return totalGuides; }
    public void setTotalGuides(long totalGuides) { this.totalGuides = totalGuides; }
}
