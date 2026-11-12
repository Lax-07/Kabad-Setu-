# Local image analysis dependencies

- OWL-ViT ONNX conversion: [Xenova/owlvit-base-patch32](https://huggingface.co/Xenova/owlvit-base-patch32), revision `b75f4e52949639c3bb0b96546ea4149482f6e7ef`. Model card declares Apache-2.0. Original architecture/model by Google. Model SHA-256: `06af49bd5db977936bcddad2b45d0031072673517579d15b8cb42bf015a94156`.
- [Transformers.js](https://github.com/huggingface/transformers.js) 2.17.2, Apache-2.0. Downloaded licence: `static/vendor/transformers-LICENSE.txt`.
- [ONNX Runtime](https://github.com/microsoft/onnxruntime) Web 1.14.0, MIT. Licence: https://github.com/microsoft/onnxruntime/blob/v1.14.0/LICENSE.

Generated assets are downloaded from pinned Hugging Face and jsDelivr URLs by `scripts/setup_local_ai.py`. The app does not request external model resources during inference. The Unsplash laptop image used for manual browser validation is a temporary test fixture, not a shipped website asset.
