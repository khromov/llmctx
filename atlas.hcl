env "local" {
  url = "postgres://admin:admin@127.0.0.1/db?sslmode=disable"
  dev = "docker://postgres/15/dev?search_path=public"
  migration {
    dir = "file://migrations"
  }
}
