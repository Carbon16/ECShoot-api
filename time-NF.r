library(RMariaDB)
library(dplyr)
library(ggplot2)
library(lubridate)

# Establish a connection to the MariaDB
con <- dbConnect(MariaDB(), user='shootmgr', password='DavidNuthall', dbname='shooting', host='localhost')

# Fetch data
query <- "
    SELECT name, date, score
    FROM scores
    WHERE not name='Whitley, B' and not name='Hamlyn, H' and not name='Matson, I' and not name='Scott, O'
"
df <- dbGetQuery(con, query)

# Convert date to Date
df$date <- as.Date(df$date)

# Plot score over time, faceted by name, with a curvy trendline
p <- ggplot(df, aes(x=date, y=score)) +
    geom_point() +
    geom_smooth(method = "loess") +
    facet_wrap(~ name) +
    labs(x="Date", y="Score", title="Score Over Time by name")

print("done")
print(p)
# Close the database connection
dbDisconnect(con)