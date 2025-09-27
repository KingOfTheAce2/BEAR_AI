
  Compiling bear-ai-legal-assistant v1.0.0 (D:\a\BEAR_AI\BEAR_AI\src-tauri)
error[E0432]: unresolved import `calamine`
 --> src\document_analyzer.rs:2:5
  |
2 | use calamine::{open_workbook, Reader, Xls, Xlsx};
  |     ^^^^^^^^ use of unresolved module or unlinked crate `calamine`
  |
  = help: if you wanted to use a crate named `calamine`, use `cargo add calamine` to add it to your `Cargo.toml`

error[E0432]: unresolved import `csv`
 --> src\document_analyzer.rs:3:5
  |
3 | use csv::ReaderBuilder;
  |     ^^^ use of unresolved module or unlinked crate `csv`
  |
  = help: if you wanted to use a crate named `csv`, use `cargo add csv` to add it to your `Cargo.toml`

error[E0432]: unresolved import `zip`
  --> src\document_analyzer.rs:11:5
   |
11 | use zip::ZipArchive;
   |     ^^^ use of unresolved module or unlinked crate `zip`
   |
   = help: if you wanted to use a crate named `zip`, use `cargo add zip` to add it to your `Cargo.toml`

error[E0432]: unresolved import `whatlang`
  --> src\document_analyzer.rs:12:5
   |
12 | use whatlang::{detect, Lang};
   |     ^^^^^^^^ use of unresolved module or unlinked crate `whatlang`
   |
   = help: if you wanted to use a crate named `whatlang`, use `cargo add whatlang` to add it to your `Cargo.toml`

error[E0432]: unresolved import `lopdf`
  --> src\document_analyzer.rs:13:5
   |
13 | use lopdf::Document as PdfDocument;
   |     ^^^^^ use of unresolved module or unlinked crate `lopdf`
   |
   = help: if you wanted to use a crate named `lopdf`, use `cargo add lopdf` to add it to your `Cargo.toml`

error[E0432]: unresolved import `sysinfo`
   --> src\llm_manager.rs:765:13
    |
765 |         use sysinfo::{System, SystemExt};
    |             ^^^^^^^ use of unresolved module or unlinked crate `sysinfo`
    |
help: there is a crate or module with a similar name
    |
765 |         use sys_info::{System, SystemExt};
    |                +

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `tokio_tungstenite`
   --> src\mcp_server.rs:419:13
    |
419 |         use tokio_tungstenite::{accept_async, tungstenite::Message};
    |             ^^^^^^^^^^^^^^^^^ use of unresolved module or unlinked crate `tokio_tungstenite`
    |
    = help: if you wanted to use a crate named `tokio_tungstenite`, use `cargo add tokio_tungstenite` to add it to your `Cargo.toml`

error[E0432]: unresolved import `tokio_tungstenite`
   --> src\mcp_server.rs:419:13
    |
419 |         use tokio_tungstenite::{accept_async, tungstenite::Message};
    |             ^^^^^^^^^^^^^^^^^ use of unresolved module or unlinked crate `tokio_tungstenite`
    |
    = help: if you wanted to use a crate named `tokio_tungstenite`, use `cargo add tokio_tungstenite` to add it to your `Cargo.toml`

error[E0432]: unresolved import `futures_util`
   --> src\mcp_server.rs:420:13
    |
420 |         use futures_util::{SinkExt, StreamExt};
    |             ^^^^^^^^^^^^ use of unresolved module or unlinked crate `futures_util`
    |
    = help: if you wanted to use a crate named `futures_util`, use `cargo add futures_util` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `qdrant_client`
  --> src\nemotron_rag.rs:13:5
   |
13 | use qdrant_client::{
   |     ^^^^^^^^^^^^^ use of unresolved module or unlinked crate `qdrant_client`
   |
   = help: if you wanted to use a crate named `qdrant_client`, use `cargo add qdrant_client` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `lance`
  --> src\nemotron_rag.rs:21:5
   |
21 | use lance::dataset::{Dataset, WriteParams, WriteMode};
   |     ^^^^^ use of unresolved module or unlinked crate `lance`
   |
   = help: if you wanted to use a crate named `lance`, use `cargo add lance` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `lance`
  --> src\nemotron_rag.rs:22:5
   |
22 | use lance::table::Table;
   |     ^^^^^ use of unresolved module or unlinked crate `lance`
   |
   = help: if you wanted to use a crate named `lance`, use `cargo add lance` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
  --> src\nemotron_rag.rs:23:5
   |
23 | use arrow::array::{Array, Float32Array, StringArray};
   |     ^^^^^ use of unresolved module or unlinked crate `arrow`
   |
   = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
  --> src\nemotron_rag.rs:24:5
   |
24 | use arrow::record_batch::RecordBatch;
   |     ^^^^^ use of unresolved module or unlinked crate `arrow`
   |
   = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0432]: unresolved import `futures_util`
  --> src\model_commands.rs:10:5
   |
10 | use futures_util::{StreamExt, TryStreamExt};
   |     ^^^^^^^^^^^^ use of unresolved module or unlinked crate `futures_util`
   |
   = help: if you wanted to use a crate named `futures_util`, use `cargo add futures_util` to add it to your `Cargo.toml`

error[E0432]: unresolved import `candle_core`
  --> src\nemotron_rag.rs:27:5
   |
27 | use candle_core::{Device, Tensor, DType};
   |     ^^^^^^^^^^^ use of unresolved module or unlinked crate `candle_core`
   |
   = help: if you wanted to use a crate named `candle_core`, use `cargo add candle_core` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `candle_transformers`
  --> src\nemotron_rag.rs:29:5
   |
29 | use candle_transformers::models::bert::BertModel;
   |     ^^^^^^^^^^^^^^^^^^^ use of unresolved module or unlinked crate `candle_transformers`
   |
   = help: if you wanted to use a crate named `candle_transformers`, use `cargo add candle_transformers` to add it to your `Cargo.toml`

error[E0432]: unresolved import `candle_nn`
  --> src\nemotron_rag.rs:28:5
   |
28 | use candle_nn::VarBuilder;
   |     ^^^^^^^^^ use of unresolved module or unlinked crate `candle_nn`
   |
   = help: if you wanted to use a crate named `candle_nn`, use `cargo add candle_nn` to add it to your `Cargo.toml`

error[E0432]: unresolved import `tokenizers`
  --> src\nemotron_rag.rs:30:5
   |
30 | use tokenizers::Tokenizer;
   |     ^^^^^^^^^^ use of unresolved module or unlinked crate `tokenizers`
   |
   = help: if you wanted to use a crate named `tokenizers`, use `cargo add tokenizers` to add it to your `Cargo.toml`

error[E0432]: unresolved import `redis`
  --> src\nemotron_rag.rs:33:5
   |
33 | use redis::AsyncCommands;
   |     ^^^^^ use of unresolved module or unlinked crate `redis`
   |
   = help: if you wanted to use a crate named `redis`, use `cargo add redis` to add it to your `Cargo.toml`

error[E0432]: unresolved import `lru`
  --> src\nemotron_rag.rs:34:5
   |
34 | use lru::LruCache;
   |     ^^^ use of unresolved module or unlinked crate `lru`
   |
   = help: if you wanted to use a crate named `lru`, use `cargo add lru` to add it to your `Cargo.toml`

error[E0432]: unresolved import `parking_lot`
  --> src\security.rs:12:5
   |
12 | use parking_lot::RwLock;
   |     ^^^^^^^^^^^ use of unresolved module or unlinked crate `parking_lot`
   |
   = help: if you wanted to use a crate named `parking_lot`, use `cargo add parking_lot` to add it to your `Cargo.toml`

error[E0432]: unresolved import `sysinfo`
   --> src\llm_commands.rs:681:13
    |
681 |         use sysinfo::{System, SystemExt};
    |             ^^^^^^^ use of unresolved module or unlinked crate `sysinfo`
    |
help: there is a crate or module with a similar name
    |
681 |         use sys_info::{System, SystemExt};
    |                +

error[E0432]: unresolved import `sysinfo`
 --> src\performance_tracker.rs:7:5
  |
7 | use sysinfo::{System, SystemExt, DiskExt, ProcessExt, CpuExt};
  |     ^^^^^^^ use of unresolved module or unlinked crate `sysinfo`
  |
help: there is a crate or module with a similar name
  |
7 | use sys_info::{System, SystemExt, DiskExt, ProcessExt, CpuExt};
  |        +

error[E0432]: unresolved import `lazy_static`
   --> src\performance_tracker.rs:921:5
    |
921 | use lazy_static::lazy_static;
    |     ^^^^^^^^^^^ use of unresolved module or unlinked crate `lazy_static`
    |
    = help: if you wanted to use a crate named `lazy_static`, use `cargo add lazy_static` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `zip`
   --> src\document_analyzer.rs:446:42
    |
446 |                 if let Ok(mut archive) = zip::ZipArchive::new(cursor) {
    |                                          ^^^ use of unresolved module or unlinked crate `zip`
    |
    = help: if you wanted to use a crate named `zip`, use `cargo add zip` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `zip`
   --> src\document_analyzer.rs:509:15
    |
509 |         match zip::ZipArchive::new(cursor) {
    |               ^^^ use of unresolved module or unlinked crate `zip`
    |
    = help: if you wanted to use a crate named `zip`, use `cargo add zip` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `zip`
    --> src\document_analyzer.rs:1810:34
     |
1810 |         if let Ok(mut archive) = zip::ZipArchive::new(cursor) {
     |                                  ^^^ use of unresolved module or unlinked crate `zip`
     |
     = help: if you wanted to use a crate named `zip`, use `cargo add zip` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `candle_core`
   --> src\nemotron_rag.rs:222:29
    |
222 |         let model_weights = candle_core::safetensors::load(
    |                             ^^^^^^^^^^^ use of unresolved module or unlinked crate `candle_core`
    |
    = help: if you wanted to use a crate named `candle_core`, use `cargo add candle_core` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:350:30
    |
350 |                 let schema = arrow::datatypes::Schema::new(vec![
    |                              ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:351:21
    |
351 |                     arrow::datatypes::Field::new("id", arrow::datatypes::DataType::Utf8, false),
    |                     ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:351:56
    |
351 |                     arrow::datatypes::Field::new("id", arrow::datatypes::DataType::Utf8, false),
    |                                                        ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:352:21
    |
352 |                     arrow::datatypes::Field::new("document_id", arrow::datatypes::DataType::Utf8, false),
    |                     ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:352:65
    |
352 |                     arrow::datatypes::Field::new("document_id", arrow::datatypes::DataType::Utf8, false),
    |                                                                 ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:353:21
    |
353 |                     arrow::datatypes::Field::new("content", arrow::datatypes::DataType::Utf8, false),
    |                     ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:353:61
    |
353 |                     arrow::datatypes::Field::new("content", arrow::datatypes::DataType::Utf8, false),
    |                                                             ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:354:21
    |
354 |                     arrow::datatypes::Field::new("embedding",
    |                     ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:355:25
    |
355 |                         arrow::datatypes::DataType::List(Arc::new(
    |                         ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:356:29
    |
356 | ...                   arrow::datatypes::Field::new("item", arrow::datatypes::DataType::Float32, false)
    |                       ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:356:66
    |
356 | ...                   arrow::datatypes::Field::new("item", arrow::datatypes::DataType::Float32, false)
    |                                                            ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:358:21
    |
358 |                     arrow::datatypes::Field::new("confidence", arrow::datatypes::DataType::Float32, false),
    |                     ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `arrow`
   --> src\nemotron_rag.rs:358:64
    |
358 |                     arrow::datatypes::Field::new("confidence", arrow::datatypes::DataType::Float32, false),
    |                                                                ^^^^^ use of unresolved module or unlinked crate `arrow`
    |
    = help: if you wanted to use a crate named `arrow`, use `cargo add arrow` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `futures`
   --> src\nemotron_rag.rs:687:42
    |
687 |         let embeddings: Result<Vec<_>> = futures::future::try_join_all(
    |                                          ^^^^^^^ use of unresolved module or unlinked crate `futures`
    |
    = help: if you wanted to use a crate named `futures`, use `cargo add futures` to add it to your `Cargo.toml`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `redis`
   --> src\nemotron_rag.rs:480:18
    |
480 |             Some(redis::Client::open(redis_url.as_str())?)
    |                  ^^^^^ use of unresolved module or unlinked crate `redis`
    |
    = help: if you wanted to use a crate named `redis`, use `cargo add redis` to add it to your `Cargo.toml`
help: consider importing one of these structs
    |
  4 + use reqwest::Client;
    |
  4 + use tauri::api::http::Client;
    |
help: if you import `Client`, refer to it directly
    |
480 -             Some(redis::Client::open(redis_url.as_str())?)
480 +             Some(Client::open(redis_url.as_str())?)
    |

error[E0425]: cannot find value `GLOBAL_PERFORMANCE_TRACKER` in this scope
   --> src\performance_tracker.rs:932:30
    |
932 |     let mut global_tracker = GLOBAL_PERFORMANCE_TRACKER.write().unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^ not found in this scope

error[E0425]: cannot find value `GLOBAL_PERFORMANCE_TRACKER` in this scope
   --> src\performance_tracker.rs:940:5
    |
940 |     GLOBAL_PERFORMANCE_TRACKER.read().unwrap().clone()
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^ not found in this scope

error[E0412]: cannot find type `RAGHealth` in module `nemotron_rag`
   --> src\lib.rs:157:27
    |
157 | ) -> Result<nemotron_rag::RAGHealth, String> {
    |                           ^^^^^^^^^ not found in `nemotron_rag`

warning: variant `Attorney_Client_Privileged` should have an upper camel case name
  --> src\document_analyzer.rs:70:5
   |
70 |     Attorney_Client_Privileged,
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^ help: convert the identifier to upper camel case: `AttorneyClientPrivileged`
   |
   = note: `#[warn(non_camel_case_types)]` on by default

warning: variant `Work_Product` should have an upper camel case name
  --> src\document_analyzer.rs:71:5
   |
71 |     Work_Product,
   |     ^^^^^^^^^^^^ help: convert the identifier to upper camel case: `WorkProduct`

warning: variant `Intellectual_Property` should have an upper camel case name
   --> src\document_analyzer.rs:174:5
    |
174 |     Intellectual_Property,
    |     ^^^^^^^^^^^^^^^^^^^^^ help: convert the identifier to upper camel case: `IntellectualProperty`

warning: variant `Data_Privacy` should have an upper camel case name
   --> src\document_analyzer.rs:175:5
    |
175 |     Data_Privacy,
    |     ^^^^^^^^^^^^ help: convert the identifier to upper camel case: `DataPrivacy`

warning: unused import: `BufReader`
 --> src\llm_manager.rs:9:34
  |
9 | use tokio::io::{AsyncBufReadExt, BufReader};
  |                                  ^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` on by default

warning: unused import: `SocketAddr`
   --> src\llm_manager.rs:374:24
    |
374 |         use std::net::{SocketAddr, TcpListener};
    |                        ^^^^^^^^^^

warning: unused import: `std::path::Path`
 --> src\mcp_server.rs:4:5
  |
4 | use std::path::Path;
  |     ^^^^^^^^^^^^^^^

warning: unused import: `tokio::sync::mpsc`
 --> src\mcp_server.rs:7:5
  |
7 | use tokio::sync::mpsc;
  |     ^^^^^^^^^^^^^^^^^

warning: unused imports: `debug` and `warn`
 --> src\model_commands.rs:7:17
  |
7 | use log::{info, warn, error, debug};
  |                 ^^^^         ^^^^^

warning: unused import: `SocketAddr`
   --> src\model_commands.rs:560:37
    |
560 |         use std::net::{TcpListener, SocketAddr};
    |                                     ^^^^^^^^^^

warning: unused import: `json`
 --> src\mollie_integration.rs:4:18
  |
4 | use serde_json::{json, Value};
  |                  ^^^^

warning: unused import: `std::env`
 --> src\mollie_integration.rs:6:5
  |
6 | use std::env;
  |     ^^^^^^^^

warning: unused imports: `AppHandle` and `Manager`
 --> src\mollie_integration.rs:9:13
  |
9 | use tauri::{AppHandle, Manager, State};
  |             ^^^^^^^^^  ^^^^^^^

warning: unused imports: `DateTime` and `Utc`
  --> src\mollie_integration.rs:10:14
   |
10 | use chrono::{DateTime, Utc};
   |              ^^^^^^^^  ^^^

warning: unused import: `uuid::Uuid`
  --> src\nemotron_rag.rs:10:5
   |
10 | use uuid::Uuid;
   |     ^^^^^^^^^^

error[E0599]: no method named `generate_response` found for reference `&Arc<LLMManager>` in the current scope
   --> src\document_analyzer.rs:958:27
    |
958 |         match llm_manager.generate_response(&prompt, None).await {
    |                           ^^^^^^^^^^^^^^^^^ method not found in `&Arc<LLMManager>`

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src\document_analyzer.rs:959:16
    |
959 |             Ok(response) => {
    |                ^^^^^^^^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `str`
    = note: all local variables must have a statically known size

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src\document_analyzer.rs:959:13
    |
959 |             Ok(response) => {
    |             ^^^^^^^^^^^^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `str`
note: required by a bound in `std::prelude::v1::Ok`
   --> /rustc/1159e78c4747b02ef996e55082b704c09b970588\library\core\src\result.rs:552:5

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src\document_analyzer.rs:963:13
    |
963 |             Err(e) => {
    |             ^^^^^^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `str`
note: required by a bound in `std::prelude::v1::Err`
   --> /rustc/1159e78c4747b02ef996e55082b704c09b970588\library\core\src\result.rs:557:5

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src\document_analyzer.rs:958:60
    |
958 |         match llm_manager.generate_response(&prompt, None).await {
    |                                                            ^^^^^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `str`
note: required by an implicit `Sized` bound in `Result`
   --> /rustc/1159e78c4747b02ef996e55082b704c09b970588\library\core\src\result.rs:548:1

warning: unused variable: `analyzer`
   --> src\local_api.rs:804:5
    |
804 |     analyzer: &DocumentAnalyzer,
    |     ^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_analyzer`
    |
    = note: `#[warn(unused_variables)]` on by default

error[E0716]: temporary value dropped while borrowed
   --> src\local_api.rs:807:34
    |
807 |     let query_terms: Vec<&str> = query.query.to_lowercase().split_whitespace().collect();
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^                             - temporary value is freed at the end of this statement
    |                                  |
    |                                  creates a temporary value which is freed while still in use
...
823 |         for term in &query_terms {
    |                     ------------ borrow later used here
    |
    = note: consider using a `let` binding to create a longer lived value

warning: unused variable: `config`
  --> src\llm_commands.rs:95:5
   |
95 |     config: Option<LlmConfig>,
   |     ^^^^^^ help: if this is intentional, prefix it with an underscore: `_config`

error[E0599]: no method named `show_model` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:181:34
    |
181 |         let result = llm_manager.show_model(&name).await;
    |                                  ^^^^^^^^^^ method not found in `&Arc<LLMManager>`

error[E0599]: no method named `pull_model` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:197:27
    |
197 |         match llm_manager.pull_model(request).await {
    |                           ^^^^^^^^^^ method not found in `&Arc<LLMManager>`

error[E0599]: no method named `delete_model` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:217:34
    |
217 |         let result = llm_manager.delete_model(&name).await;
    |                                  ^^^^^^^^^^^^
    |
help: there is a method `remove_model` with a similar name
    |
217 -         let result = llm_manager.delete_model(&name).await;
217 +         let result = llm_manager.remove_model(&name).await;
    |

error[E0599]: no method named `generate` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:239:34
    |
239 |         let result = llm_manager.generate(request).await;
    |                                  ^^^^^^^^ method not found in `&Arc<LLMManager>`
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `generate`, perhaps you need to implement one of them:
            candidate #1: `BlockRngCore`
            candidate #2: `GenericSequence`

error[E0599]: no method named `chat` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:296:34
    |
296 |         let result = llm_manager.chat(request).await;
    |                                  ^^^^ method not found in `&Arc<LLMManager>`

error[E0599]: no method named `embeddings` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:352:34
    |
352 |         let result = llm_manager.embeddings(request).await;
    |                                  ^^^^^^^^^^ method not found in `&Arc<LLMManager>`

error[E0599]: no method named `create_model` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:368:27
    |
368 |         match llm_manager.create_model(request).await {
    |                           ^^^^^^^^^^^^
    |
help: there is a method `remove_model` with a similar name
    |
368 -         match llm_manager.create_model(request).await {
368 +         match llm_manager.remove_model(request).await {
    |

error[E0599]: no method named `copy_model` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:389:27
    |
389 |         match llm_manager.copy_model(&source, &destination).await {
    |                           ^^^^^^^^^^
    |
help: there is a method `load_model` with a similar name, but with different arguments
   --> src\llm_manager.rs:246:5
    |
246 |     pub async fn load_model(&self, model_id: &str) -> Result<String> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `list_running_models` found for reference `&Arc<LLMManager>` in the current scope
   --> src\llm_commands.rs:408:34
    |
408 |         let result = llm_manager.list_running_models().await;
    |                                  ^^^^^^^^^^^^^^^^^^^
    |
help: there is a method `list_models` with a similar name
    |
408 -         let result = llm_manager.list_running_models().await;
408 +         let result = llm_manager.list_models().await;
    |

error[E0277]: `Result<HashMap<std::string::String, std::string::String>, anyhow::Error>` is not a future
   --> src\llm_commands.rs:423:52
    |
423 |         let result = llm_manager.get_system_info().await;
    |                                                    ^^^^^ `Result<HashMap<std::string::String, std::string::String>, anyhow::Error>` is not a future
    |
    = help: the trait `std::future::Future` is not implemented for `Result<HashMap<std::string::String, std::string::String>, anyhow::Error>`
    = note: Result<HashMap<std::string::String, std::string::String>, anyhow::Error> must be a future or must implement `IntoFuture` to be awaited
    = note: required for `Result<HashMap<std::string::String, std::string::String>, anyhow::Error>` to implement `IntoFuture`
help: remove the `.await`
    |
423 -         let result = llm_manager.get_system_info().await;
423 +         let result = llm_manager.get_system_info();
    |

error[E0560]: struct `ModelPerformanceMetrics` has no field named `avg_tokens_per_second`
   --> src\llm_commands.rs:596:21
    |
596 |                     avg_tokens_per_second: latest_metric.tokens_per_second,
    |                     ^^^^^^^^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `avg_response_time_ms`
   --> src\llm_commands.rs:597:21
    |
597 |                     avg_response_time_ms: latest_metric.response_time_ms,
    |                     ^^^^^^^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `memory_usage_mb`
   --> src\llm_commands.rs:598:21
    |
598 |                     memory_usage_mb: latest_metric.memory_usage_mb,
    |                     ^^^^^^^^^^^^^^^ unknown field
    |
help: a field with a similar name exists
    |
598 |                     peak_memory_usage_mb: latest_metric.memory_usage_mb,
    |                     +++++

error[E0560]: struct `ModelPerformanceMetrics` has no field named `gpu_utilization`
   --> src\llm_commands.rs:599:21
    |
599 |                     gpu_utilization: latest_metric.gpu_usage_percent,
    |                     ^^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `total_requests`
   --> src\llm_commands.rs:600:21
    |
600 |                     total_requests: 1, // This would need to be tracked separately
    |                     ^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `error_count`
   --> src\llm_commands.rs:601:21
    |
601 |                     error_count: latest_metric.error_count as u64,
    |                     ^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `uptime_seconds`
   --> src\llm_commands.rs:602:21
    |
602 |                     uptime_seconds: {
    |                     ^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `avg_tokens_per_second`
   --> src\llm_commands.rs:629:17
    |
629 |                 avg_tokens_per_second: 15.2,
    |                 ^^^^^^^^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `avg_response_time_ms`
   --> src\llm_commands.rs:630:17
    |
630 |                 avg_response_time_ms: 2500,
    |                 ^^^^^^^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `memory_usage_mb`
   --> src\llm_commands.rs:631:17
    |
631 |                 memory_usage_mb: 4096,
    |                 ^^^^^^^^^^^^^^^ unknown field
    |
help: a field with a similar name exists
    |
631 |                 peak_memory_usage_mb: 4096,
    |                 +++++

error[E0560]: struct `ModelPerformanceMetrics` has no field named `gpu_utilization`
   --> src\llm_commands.rs:632:17
    |
632 |                 gpu_utilization: 78.5,
    |                 ^^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `total_requests`
   --> src\llm_commands.rs:633:17
    |
633 |                 total_requests: 1250,
    |                 ^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `error_count`
   --> src\llm_commands.rs:634:17
    |
634 |                 error_count: 5,
    |                 ^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

error[E0560]: struct `ModelPerformanceMetrics` has no field named `uptime_seconds`
   --> src\llm_commands.rs:635:17
    |
635 |                 uptime_seconds: 86400,
    |                 ^^^^^^^^^^^^^^ `ModelPerformanceMetrics` does not have this field
    |
    = note: available fields are: `model_size_mb`, `load_time_ms`, `load_success`, `load_error_message`, `first_token_latency_ms` ... and 8 others

warning: variable does not need to be mutable
   --> src\llm_manager.rs:275:13
    |
275 |         let mut child = cmd.spawn().context("Failed to start llama-server")?;
    |             ----^^^^^
    |             |
    |             help: remove this `mut`
    |
    = note: `#[warn(unused_mut)]` on by default

warning: unused variable: `mapping`
    --> src\mcp_server.rs:1325:23
     |
1325 |             for (key, mapping) in &step.input_mapping {
     |                       ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_mapping`

warning: unused variable: `quantization`
   --> src\model_commands.rs:324:56
    |
324 |     pub async fn download_model(&self, model_id: &str, quantization: Option<String>) -> Result<()> {
    |                                                        ^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_quantization`

warning: variable does not need to be mutable
   --> src\model_commands.rs:330:13
    |
330 |         let mut model_info = model_info.ok_or_else(|| anyhow!("Model not found: {}", model_id))?;
    |             ----^^^^^^^^^^
    |             |
    |             help: remove this `mut`

error[E0599]: no method named `next` found for opaque type `impl Stream<Item = Result<bytes::bytes::Bytes, reqwest::Error>>` in the current scope
   --> src\model_commands.rs:415:47
    |
415 |         while let Some(chunk_result) = stream.next().await {
    |                                               ^^^^ method not found in `impl Stream<Item = Result<bytes::bytes::Bytes, reqwest::Error>>`
    |
    = help: items from traits can only be used if the trait is in scope
help: the following traits which provide `next` are implemented but not in scope; perhaps you want to import one of them
    |
  1 + use futures_util::stream::stream::StreamExt;
    |
  1 + use tokio_stream::StreamExt;
    |

error[E0277]: the size for values of type `[u8]` cannot be known at compilation time
   --> src\model_commands.rs:416:17
    |
416 |             let chunk = chunk_result?;
    |                 ^^^^^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `[u8]`
    = note: all local variables must have a statically known size

error[E0277]: the size for values of type `[u8]` cannot be known at compilation time
   --> src\model_commands.rs:416:25
    |
416 |             let chunk = chunk_result?;
    |                         ^^^^^^^^^^^^^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `[u8]`
    = note: all local variables must have a statically known size

error[E0277]: the size for values of type `[u8]` cannot be known at compilation time
   --> src\model_commands.rs:416:37
    |
416 |             let chunk = chunk_result?;
    |                                     ^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `[u8]`
note: required by a bound in `Break`
   --> /rustc/1159e78c4747b02ef996e55082b704c09b970588\library\core\src\ops\control_flow.rs:95:5

warning: variable `current_pos` is assigned to, but never used
   --> src\nemotron_rag.rs:633:17
    |
633 |         let mut current_pos = 0;
    |                 ^^^^^^^^^^^
    |
    = note: consider using `_current_pos` instead

warning: unused variable: `i`
   --> src\nemotron_rag.rs:659:22
    |
659 |                 for (i, chunk_content) in section_chunks.iter().enumerate() {
    |                      ^ help: if this is intentional, prefix it with an underscore: `_i`

warning: value assigned to `current_pos` is never read
   --> src\nemotron_rag.rs:678:13
    |
678 |             current_pos = section_end;
    |             ^^^^^^^^^^^
    |
    = help: maybe it is overwritten before being read?
    = note: `#[warn(unused_assignments)]` on by default

warning: unused variable: `context`
   --> src\nemotron_rag.rs:783:38
    |
783 |     async fn sparse_retrieval(&self, context: &QueryContext) -> Result<RetrievalResult> {
    |                                      ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_context`

warning: unused variable: `context`
   --> src\nemotron_rag.rs:820:37
    |
820 |     async fn graph_retrieval(&self, context: &QueryContext) -> Result<RetrievalResult> {
    |                                     ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_context`

warning: unused variable: `context`
   --> src\nemotron_rag.rs:865:69
    |
865 |     async fn rerank_with_nemotron(&self, results: &RetrievalResult, context: &QueryContext) -> Result<RetrievalResult> {
    |                                                                     ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_context`

warning: unused variable: `context`
   --> src\nemotron_rag.rs:907:69
    |
907 |     async fn calculate_confidence(&self, results: &RetrievalResult, context: &QueryContext) -> Result<f32> {
    |                                                                     ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_context`

warning: unused variable: `query`
    --> src\nemotron_rag.rs:1063:40
     |
1063 |     async fn get_legal_synonyms(&self, query: &str) -> Result<Vec<String>> {
     |                                        ^^^^^ help: if this is intentional, prefix it with an underscore: `_query`

error[E0599]: no method named `calculate_timeout_rate` found for reference `&PerformanceTracker` in the current scope
   --> src\performance_tracker.rs:311:40
    |
311 |             timeout_rate_percent: self.calculate_timeout_rate(&recent_metrics),
    |                                        ^^^^^^^^^^^^^^^^^^^^^^ method not found in `&PerformanceTracker`

error[E0599]: no method named `detect_gpu_count` found for reference `&PerformanceTracker` in the current scope
   --> src\performance_tracker.rs:382:29
    |
382 |             gpu_count: self.detect_gpu_count().await,
    |                             ^^^^^^^^^^^^^^^^ method not found in `&PerformanceTracker`

error[E0599]: no method named `get_disk_read_speed` found for reference `&PerformanceTracker` in the current scope
   --> src\performance_tracker.rs:388:40
    |
388 |             disk_read_mb_per_sec: self.get_disk_read_speed(&system).await,
    |                                        ^^^^^^^^^^^^^^^^^^^ method not found in `&PerformanceTracker`

error[E0599]: no method named `get_disk_write_speed` found for reference `&PerformanceTracker` in the current scope
   --> src\performance_tracker.rs:389:41
    |
389 |             disk_write_mb_per_sec: self.get_disk_write_speed(&system).await,
    |                                         ^^^^^^^^^^^^^^^^^^^^ method not found in `&PerformanceTracker`

error[E0599]: no method named `get_network_in_speed` found for reference `&PerformanceTracker` in the current scope
   --> src\performance_tracker.rs:390:41
    |
390 |             network_in_mb_per_sec: self.get_network_in_speed().await,
    |                                         ^^^^^^^^^^^^^^^^^^^^ method not found in `&PerformanceTracker`

error[E0599]: no method named `get_network_out_speed` found for reference `&PerformanceTracker` in the current scope
   --> src\performance_tracker.rs:391:42
    |
391 |             network_out_mb_per_sec: self.get_network_out_speed().await,
    |                                          ^^^^^^^^^^^^^^^^^^^^^ method not found in `&PerformanceTracker`

error[E0689]: can't call method `min` on ambiguous numeric type `{float}`
   --> src\performance_tracker.rs:764:31
    |
764 |         total_read_mb_per_sec.min(2000.0) // Cap at reasonable maximum
    |                               ^^^
    |
help: you must specify a type for this binding, like `f32`
    |
742 |         let mut total_read_mb_per_sec: f32 = 0.0;
    |                                      +++++

error[E0689]: can't call method `min` on ambiguous numeric type `{float}`
   --> src\performance_tracker.rs:793:32
    |
793 |         total_write_mb_per_sec.min(1500.0) // Cap at reasonable maximum
    |                                ^^^
    |
help: you must specify a type for this binding, like `f32`
    |
772 |         let mut total_write_mb_per_sec: f32 = 0.0;
    |                                       +++++

error[E0061]: this method takes 1 argument but 2 arguments were supplied
   --> src\lib.rs:70:16
    |
 70 |     rag_system.process_document(document, None)
    |                ^^^^^^^^^^^^^^^^ --------  ---- unexpected argument #2 of type `std::option::Option<_>`
    |                                 |
    |                                 expected `LegalDocument`, found `String`
    |
note: method defined here
   --> src\nemotron_rag.rs:518:18
    |
518 |     pub async fn process_document(&mut self, document: LegalDocument) -> Result<Vec<RAGChunk>> {
    |                  ^^^^^^^^^^^^^^^^            -----------------------
help: remove the extra argument
    |
 70 -     rag_system.process_document(document, None)
 70 +     rag_system.process_document(/* LegalDocument */)
    |

error[E0061]: this method takes 1 argument but 2 arguments were supplied
   --> src\lib.rs:88:16
    |
 88 |     rag_system.retrieve(query, None)
    |                ^^^^^^^^ -----  ---- unexpected argument #2 of type `std::option::Option<_>`
    |                         |
    |                         expected `QueryContext`, found `String`
    |
note: method defined here
   --> src\nemotron_rag.rs:541:18
    |
541 |     pub async fn retrieve(&self, context: QueryContext) -> Result<RetrievalResult> {
    |                  ^^^^^^^^        ---------------------
help: remove the extra argument
    |
 88 -     rag_system.retrieve(query, None)
 88 +     rag_system.retrieve(/* QueryContext */)
    |

error[E0061]: this method takes 1 argument but 2 arguments were supplied
   --> src\lib.rs:104:40
    |
104 |     let retrieval_results = rag_system.retrieve(query.clone(), None)
    |                                        ^^^^^^^^ -------------  ---- unexpected argument #2 of type `std::option::Option<_>`
    |                                                 |
    |                                                 expected `QueryContext`, found `String`
    |
note: method defined here
   --> src\nemotron_rag.rs:541:18
    |
541 |     pub async fn retrieve(&self, context: QueryContext) -> Result<RetrievalResult> {
    |                  ^^^^^^^^        ---------------------
help: remove the extra argument
    |
104 -     let retrieval_results = rag_system.retrieve(query.clone(), None)
104 +     let retrieval_results = rag_system.retrieve(/* QueryContext */)
    |

error[E0061]: this method takes 1 argument but 2 arguments were supplied
   --> src\lib.rs:134:34
    |
134 |         let results = rag_system.retrieve(current_query.clone(), None)
    |                                  ^^^^^^^^ ---------------------  ---- unexpected argument #2 of type `std::option::Option<_>`
    |                                           |
    |                                           expected `QueryContext`, found `String`
    |
note: method defined here
   --> src\nemotron_rag.rs:541:18
    |
541 |     pub async fn retrieve(&self, context: QueryContext) -> Result<RetrievalResult> {
    |                  ^^^^^^^^        ---------------------
help: remove the extra argument
    |
134 -         let results = rag_system.retrieve(current_query.clone(), None)
134 +         let results = rag_system.retrieve(/* QueryContext */)
    |

error[E0599]: no method named `get_health` found for reference `&Arc<NemotronRAG>` in the current scope
   --> src\lib.rs:162:16
    |
162 |     rag_system.get_health()
    |                ^^^^^^^^^^ method not found in `&Arc<NemotronRAG>`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `num_cpus`
   --> src\model_commands.rs:115:22
    |
115 |             threads: num_cpus::get() as u32,
    |                      ^^^^^^^^ use of unresolved module or unlinked crate `num_cpus`
    |
    = help: if you wanted to use a crate named `num_cpus`, use `cargo add num_cpus` to add it to your `Cargo.toml`

error[E0282]: type annotations needed for `Arc<_, _>`
   --> src\performance_tracker.rs:419:13
    |
419 |         let system = Arc::clone(&self.system);
    |             ^^^^^^
...
430 |                     let mut sys = system.lock().await;
    |                                          ---- type must be known at this point
    |
help: consider giving `system` an explicit type, where the type for type parameter `T` is specified
    |
419 |         let system: Arc<T, A> = Arc::clone(&self.system);
    |                   +++++++++++

error[E0277]: `EncodingKey` doesn't implement `std::fmt::Debug`
   --> src\security.rs:224:5
    |
215 | #[derive(Debug)]
    |          ----- in this derive macro expansion
...
224 |     jwt_encoding_key: EncodingKey,
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the trait `std::fmt::Debug` is not implemented for `EncodingKey`

error[E0277]: `DecodingKey` doesn't implement `std::fmt::Debug`
   --> src\security.rs:225:5
    |
215 | #[derive(Debug)]
    |          ----- in this derive macro expansion
...
225 |     jwt_decoding_key: DecodingKey,
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the trait `std::fmt::Debug` is not implemented for `DecodingKey`

error[E0277]: `(dyn security::SessionStorage + 'static)` doesn't implement `std::fmt::Debug`
   --> src\security.rs:223:5
    |
215 | #[derive(Debug)]
    |          ----- in this derive macro expansion
...
223 |     session_storage: Box<dyn SessionStorage>,
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the trait `std::fmt::Debug` is not implemented for `(dyn security::SessionStorage + 'static)`
    |
    = help: the following other types implement trait `std::fmt::Debug`:
              dyn Any + Send + Sync
              dyn Any + Send
              dyn Any
              dyn tracing_core::field::Value

error[E0689]: can't call method `min` on ambiguous numeric type `{float}`
   --> src\huggingface.rs:370:24
    |
370 |         (score / 10.0).min(10.0)
    |                        ^^^

error[E0063]: missing field `embedding_dimension` in initializer of `NemotronConfig`
   --> src\lib.rs:171:5
    |
171 |     nemotron_rag::NemotronConfig {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ missing `embedding_dimension`

warning: unused import: `AsyncBufReadExt`
 --> src\llm_manager.rs:9:17
  |
9 | use tokio::io::{AsyncBufReadExt, BufReader};
  |                 ^^^^^^^^^^^^^^^

warning: unused import: `rand::Rng`
  --> src\security.rs:14:5
   |
14 | use rand::Rng;
   |     ^^^^^^^^^

warning: variable `neutral_count` is assigned to, but never used
    --> src\document_analyzer.rs:1461:17
     |
1461 |         let mut neutral_count = 0;
     |                 ^^^^^^^^^^^^^
     |
     = note: consider using `_neutral_count` instead

warning: unused variable: `model`
   --> src\model_commands.rs:575:13
    |
575 |         let model = self.get_model(model_id)
    |             ^^^^^ help: if this is intentional, prefix it with an underscore: `_model`

warning: unused variable: `section_markers`
   --> src\nemotron_rag.rs:973:13
    |
973 |         let section_markers = ["Section", "§", "Article", "Chapter", "Part"];
    |             ^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_section_markers`

warning: unused variable: `chunk`
   --> src\nemotron_rag.rs:980:17
    |
980 |         for (i, chunk) in sentences.chunks(chunk_size).enumerate() {
    |                 ^^^^^ help: if this is intentional, prefix it with an underscore: `_chunk`

error[E0433]: failed to resolve: use of unresolved module or unlinked crate `redis`
   --> src\nemotron_rag.rs:461:26
    |
461 |     redis_client: Option<redis::Client>,
    |                          ^^^^^ use of unresolved module or unlinked crate `redis`
    |
    = help: if you wanted to use a crate named `redis`, use `cargo add redis` to add it to your `Cargo.toml`

Some errors have detailed explanations: E0061, E0063, E0277, E0282, E0412, E0425, E0432, E0433, E0560...
For more information about an error, try `rustc --explain E0061`.
warning: `bear-ai-legal-assistant` (lib) generated 35 warnings
error: could not compile `bear-ai-legal-assistant` (lib) due to 102 previous errors; 35 warnings emitted
Error: Process completed with exit code 1.