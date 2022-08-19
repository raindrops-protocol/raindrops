
copy_idls: copy_namespace_idl copy_item_idl copy_matches_idl copy_player_idl copy_staking_idl

copy_namespace_idl:
	cp rust/target/idl/namespace.json rust/namespace-cpi

copy_item_idl:
	cp rust/target/idl/item.json rust/item-cpi

copy_matches_idl:
	cp rust/target/idl/matches.json rust/matches-cpi

copy_player_idl:
	cp rust/target/idl/player.json rust/player-cpi

copy_staking_idl:
	cp rust/target/idl/staking.json rust/staking-cpi
