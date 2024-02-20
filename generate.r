library(RMariaDB)
library(ggplot2)
library(zoo)

shootingDB <- dbConnect(RMariaDB::MariaDB(), user='shootmgr', password="DavidNuthall", dbname='shooting', host='localhost')

query<-paste("SELECT name, score, date from scores;")

# For each shooter, plot their scores over time, a density plot of their scores, and a box plot of their scores and save each plot to a file in a folder named after the shooter

rs = dbSendQuery(shootingDB, query)
dbRows<-dbFetch(rs)

# Convert date to Date type
dbRows$date <- as.Date(dbRows$date)

# Get the names of the shooters
shooters<-unique(dbRows$name)

# For each shooter, plot their scores over time, a density plot of their scores, and a box plot of their scores and save each plot to a file in a folder named after the shooter
for (s in shooters) {
    # Create a folder for the shooter in /images
    dir.create(paste("images/", s, sep=""))
    # Get the scores for the shooter
    scores<-dbRows[dbRows$name==s,]
    # Plot the scores over time
    scores$score_ma <- rollmean(scores$score, 5, fill = NA)

# Plot the data
# Plot the data
    ggplot(scores, aes(x=date)) +
        geom_point(aes(y=score)) +
        geom_smooth(aes(y=score), method = "loess", color = 'red') +
        theme(axis.text.x = element_text(angle = 90, hjust = 1)) +
        ggtitle(s)
    # save the plot to /images/NameOfShooter/scoresOverTime.png
    ggsave(paste("images/", s, "/Time.png", sep=""))
    # Plot a density plot of the scores321333
    ggplot(scores, aes(x=score)) + geom_density() + ggtitle(s)
    ggsave(paste("images/", s, "/density.png", sep=""))
    # Plot a box plot of the scores
    ggplot(scores, aes(x=score)) + geom_boxplot() + ggtitle(s)
    ggsave(paste("images/", s, "/boxplot.png", sep=""))
}

# Close the connection to the database
dbDisconnect(shootingDB)
