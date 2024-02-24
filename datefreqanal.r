library(RMariaDB)
library(ggplot2)

# Establish a connection to the MariaDB
con <- dbConnect(MariaDB(), user='shootmgr', password='DavidNuthall', dbname='shooting', host='localhost')

# Fetch data
query <- "select count(*) as cont, date, avg(score) as score from scores group by date;"
df <- dbGetQuery(con, query)

# Convert date to Date
df$date <- as.Date(df$date)

print(df)

# Plot the number of shoots against the average score
p <- ggplot(df, aes(x=score, y=cont)) +
    geom_point() +
    geom_smooth(method = "loess") +
    ggtitle("Number of shoots against average score") +
    xlab("Date") +
    ylab("Number of shoots") +
    theme(axis.text.x = element_text(angle = 90, hjust = 1))

print(p)
# Close the database connection
dbDisconnect(con)