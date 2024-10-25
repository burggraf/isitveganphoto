<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Camera, CameraResultType } from '@capacitor/camera'
	import { supabase } from '$lib/supabase'
	// import { crypto } from 'crypto'
	import { onMount } from 'svelte'
	import Cropper from 'cropperjs'
	import 'cropperjs/dist/cropper.css'

	// Define reactive state using Svelte 5 $state
	let { imageUrl, results } = $state({
		imageUrl: null,
		results: null,
	})
	let isLoading = $state(false)
	let checkCompleted = $state(false) // New state to track if check is completed
	let cropperInstance: Cropper | null = null
	let imageElement: HTMLImageElement

	const takePicture = async () => {
		const image = await Camera.getPhoto({
			quality: 90,
			allowEditing: true,
			resultType: CameraResultType.Uri,
		})
		if (image.webPath) {
			imageUrl = image.webPath // Directly assign to update imageUrl reactively
			// Initialize Cropper after image is loaded
			setTimeout(() => initializeCropper(), 0);
		}
		results = null
		checkCompleted = false
	}

	function initializeCropper() {
		if (cropperInstance) {
			cropperInstance.destroy();
		}
		cropperInstance = new Cropper(imageElement, {
			aspectRatio: NaN, // Allow free aspect ratio
			viewMode: 1,
			rotatable: true,
			scalable: true,
			autoCropArea: 1, // Show the whole image
			cropBoxMovable: true, // Allow moving the crop box
			cropBoxResizable: true, // Allow resizing the crop box
			dragMode: 'move', // Enable dragging the image
			ready: function() {
				// Clear the crop box
				this.clear();
			}
		});
	}

	async function checkIfVegan(): Promise<void> {
		if (!cropperInstance) {
			console.error('Cropper not initialized');
			return;
		}

		const croppedCanvas = cropperInstance.getCroppedCanvas();
		if (!croppedCanvas) {
			console.error('Failed to get cropped canvas');
			return;
		}

		isLoading = true // Set loading state to true
		checkCompleted = false // Reset check completed state

		try {
			const blob = await new Promise<Blob>((resolve) => croppedCanvas.toBlob(resolve, 'image/jpeg'));
			const base64Image = await blobToBase64(blob)

			// Calculate SHA-256 hash of the image
			const arrayBuffer = await blob.arrayBuffer()
			const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
			const hashArray = Array.from(new Uint8Array(hashBuffer))
			const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

			// Log the size of the image being transferred
			console.log(`Image size being transferred: ${(blob.size / 1024).toFixed(2)} KB`)

			console.log('sending image and hash to isitvegan function')
			const { data, error } = await supabase.functions.invoke('isitvegan', {
				body: { 
					image: `data:image/jpeg;base64,${base64Image}`,
					hash: fileHash
				},
			})

			console.log('data', data)
			console.log('error', error)

			if (data) {
				try {
					const json = data?.data?.result?.choices[0]?.message?.content
					if (json) {
						results = JSON.parse(json)
					}
				} catch (e) {
					results = {
						resultsError: data?.data?.result?.choices[0]?.message?.content,
						isVegan: false,
						ingredients: [],
						reason: '',
					}
					console.error('Error parsing data as JSON', e)
				}
			}
		} catch (error) {
			console.error('Error in checkIfVegan:', error)
			alert('An error occurred while checking the image')
			results = {
				resultsError: 'An error occurred while checking the image',
				isVegan: false,
				ingredients: [],
				reason: '',
			}
		} finally {
			isLoading = false // Reset loading state
			checkCompleted = true // Set check completed state to true
		}
	}

	function blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result.split(',')[1])
				} else {
					reject(new Error('Failed to convert blob to base64'))
				}
			}
			reader.onerror = (error) => reject(error)
			reader.readAsDataURL(blob)
		})
	}

	function rotateImage(direction: 'left' | 'right') {
		if (cropperInstance) {
			const angle = direction === 'left' ? -90 : 90;
			cropperInstance.rotate(angle);
		}
	}

	onMount(() => {
		return () => {
			if (cropperInstance) {
				cropperInstance.destroy();
			}
			// ... rest of your existing onMount cleanup ...
		};
	});
</script>

<div class="flex flex-col items-center justify-center min-h-screen overflow-y-auto">
	<div class="py-8 w-full max-w-4xl px-4">
		<Button class="mb-4 mt-20" on:click={takePicture}>Take Picture</Button>
		<div class="mt-4 flex flex-col items-center">
			<div class="cropper-wrapper w-full mb-4">
				<img alt="" src={imageUrl || ''} bind:this={imageElement} class="w-full" />
			</div>
			{#if imageUrl}
				<div class="mb-4 flex gap-2">
					<Button on:click={() => rotateImage('left')}>Rotate Left</Button>
					<Button on:click={() => rotateImage('right')}>Rotate Right</Button>
				</div>
			{/if}
			<Button disabled={!imageUrl || isLoading || checkCompleted} on:click={checkIfVegan}>Is it vegan?</Button>
			{#if isLoading}
				<div class="spinner"></div> <!-- Updated spinner element -->
			{/if}
			{#if results}
				<div id="analysis" class="w-full flex justify-center mt-4">
					<div class="result-box">
						<p
							id="veganStatus"
							class={results?.isVegan
								? 'text-green-500 font-bold text-2xl'
								: 'text-red-500 font-bold text-2xl'}
						>
							{results?.resultsError ? 'Error' : results?.isVegan ? 'Vegan' : 'Not Vegan'}
						</p>
						<p id="reason" class="mb-4">{results?.reason || results?.resultsError}</p>
						{#if results?.ingredients?.length > 0}
							<h3 class="font-semibold mb-2">Ingredients:</h3>
							<ul id="ingredientsList">
								{#each results?.ingredients || [] as ingredient}
									<li>{ingredient}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
	v.0.0.5
	
</div>

<style>
	.spinner {
		display: inline-block;
		width: 80px;
		height: 80px;
	}

	.spinner:after {
		content: " ";
		display: block;
		width: 64px;
		height: 64px;
		margin: 8px;
		border-radius: 50%;
		border: 6px solid #09f;
		border-color: #09f transparent #09f transparent;
		animation: spinner 1.2s linear infinite;
	}

	@keyframes spinner {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.result-box {
		background-color: #f9f9f9;
		border: 1px solid #ddd;
		padding: 16px;
		border-radius: 8px;
		width: 80%;
		max-width: 600px;
		text-align: left;
	}
	.result-box h2,
	.result-box p,
	.result-box h3,
	.result-box ul {
		margin-bottom: 16px;
	}

	/* Add these styles for Cropper.js */
	:global(.cropper-container) {
		width: 100% !important;
	}

	:global(.cropper-wrapper .cropper-view-box) {
		outline: none;
		border: 2px solid #09f;
	}

	:global(.cropper-wrapper .cropper-face) {
		opacity: 0.1; /* Slightly visible to show the crop area */
	}

	:global(.cropper-wrapper .cropper-line) {
		background-color: #09f;
	}

	:global(.cropper-wrapper .cropper-point) {
		background-color: #09f;
	}
</style>
