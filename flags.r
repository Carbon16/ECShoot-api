library(RMariaDB)
library(dplyr)
library(lubridate)

# Establish a connection to the MariaDB database
con <- dbConnect(MariaDB(), user='shootmgr', password='DavidNuthall', dbname='shooting', host='localhost')

# Fetch data from the last couple of months
query <- "
    SELECT name, date, score
    FROM scores
    WHERE date > DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
"
df <- dbGetQuery(con, query)

# Convert date to Date
df$date <- as.Date(df$date)

# Calculate score change for each shooter
df <- df %>%
    arrange(name, date) %>%
    group_by(name) %>%
    mutate(score_change = score - lag(score))

# Print flag for each shooter based on score change
df %>%
    group_by(name) %>%
    summarise(mean_score_change = mean(score_change, na.rm = TRUE)) %>%
    mutate(flag = case_when(
        mean_score_change > 1 ~ "Green Flag",
        mean_score_change < -1 ~ "Red Flag",
        TRUE ~ "Orange Flag"
    )) %>%
    print()

# Close the database connection
dbDisconnect(con)