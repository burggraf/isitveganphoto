<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Camera, CameraResultType } from '@capacitor/camera'
	import { supabase } from '$lib/supabase'

	// Define reactive state using Svelte 5 $state
	let { imageUrl, results } = $state({
		imageUrl: null,
		results: null,
	})

	const takePicture = async () => {
		const image = await Camera.getPhoto({
			quality: 90,
			allowEditing: true,
			resultType: CameraResultType.Uri,
		})
		if (image.webPath) {
			imageUrl = image.webPath // Directly assign to update imageUrl reactively
		}
		results = null
	}

	async function checkIfVegan(): Promise<void> {
		console.log('checking if vegan')
		results = null // Directly assign to reset results reactively
		if (!imageUrl) {
			console.error('No image URL available')
			return
		}

		try {
			const response = await fetch(imageUrl)
			const blob = await response.blob()
			const base64Image = await blobToBase64(blob)

			console.log('sending image to isitvegan function')
			const { data, error } = await supabase.functions.invoke('isitvegan', {
				body: { image: `data:image/jpeg;base64,${base64Image}` },
			})

			console.log('data', data)
			console.log('error', error)

			if (data) {
				try {
					const json = data?.data?.result?.choices[0]?.message?.content
					if (json) {
						results = JSON.parse(json) // Directly assign to update results reactively
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
</script>

<div class="flex flex-col items-center justify-center min-h-screen overflow-y-auto">
	<div class="py-8">
		<Button class="mb-4 mt-20" on:click={takePicture}>Take Picture</Button>
		<div class="mt-4 flex flex-col items-center">
			<img alt="" src={imageUrl || ''} id="imageElement" class="w-3/4 mb-4" />
			<Button disabled={!imageUrl} on:click={checkIfVegan}>Is it vegan?</Button>
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
</div>

<style>
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
</style>
