library(RMariaDB)
library(dplyr)

# Establish a connection to the MariaDB
con <- dbConnect(MariaDB(), user='shootmgr', password='DavidNuthall', dbname='shooting', host='localhost')

# Fetch data
query <- "
    SELECT name, date, score
    FROM scores
"
df <- dbGetQuery(con, query)

# Convert date to Date
df$date <- as.Date(df$date)

# Calculate average score and total shoots for each day
df <- df %>%
    group_by(date) %>%
    summarise(average_score = mean(score), total_shoots = n())

# Write data to CSV file
write.csv(df, "shoots_and_scores.csv", row.names = FALSE)

# Close the database connection
dbDisconnect(con)