BIN_DIR = bin
CMD_PATHS = $(wildcard cmd/*)
BINARIES=$(foreach x, $(notdir  $(CMD_PATHS)), ${BIN_DIR}/$(x))


.PHONY: bin-dir compose $(BINARIES) all

all: $(BINARIES)
compose:
	@docker-compose down -v
	@docker-compose up -d postgres
	sleep 1
	bash -c 'while ! nc -z localhost 5432; do sleep 0.2; done;'
	sleep 1
	tern migrate --migrations ./migrations --host localhost --database tpd --user tpd --password tpd

bin-dir:
	@mkdir -p $(BIN_DIR)


$(BINARIES): | bin-dir
	go build -o $@ ./cmd/$(notdir $@)