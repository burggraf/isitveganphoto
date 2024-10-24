<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Camera, CameraResultType } from '@capacitor/camera'
	import { OpenAI } from 'openai'
    import { PUBLIC_OPENAI_API_KEY } from '$env/static/public'
	import { supabase } from '$lib/supabase'

	const openai = new OpenAI({
		apiKey: PUBLIC_OPENAI_API_KEY,
		dangerouslyAllowBrowser: true, // Note: Be cautious with this in production
	})

	let imageUrl: string | null = null

	const takePicture = async () => {
		const image = await Camera.getPhoto({
			quality: 90,
			allowEditing: true,
			resultType: CameraResultType.Uri,
		})
        if (image.webPath) {
            imageUrl = image.webPath
        }

		// Can be set to the src of an image now
		const imageElement: HTMLImageElement | null = document.getElementById(
			'imageElement'
		) as HTMLImageElement
		if (imageElement) {
			imageElement.src = imageUrl
		}
	}
	
	async function checkIfVegan(): Promise<void> {
		console.log('checking if vegan')
		if (!imageUrl) {
			console.error('No image URL available')
			return
		}

		try {
			// Fetch the image and convert it to base64
			const response = await fetch(imageUrl)
			const blob = await response.blob()
			const base64Image = await blobToBase64(blob)

			console.log('sending image to isitvegan function')
			const { data, error } = await supabase.functions.invoke('isitvegan', {
				body: { image: `data:image/jpeg;base64,${base64Image}` }
			})

			console.log('data', data)
			console.log('error', error)
			let results;
			if (data) {
				try {
					const json = data?.data?.result?.choices[0]?.message?.content
					if (json) {
						results = JSON.parse(json)
					}
				} catch (e) {
					console.error('Error parsing data as JSON', e)
				}
			}

			const veganStatusElement: HTMLHeadingElement | null = document.getElementById('veganStatus') as HTMLHeadingElement
			const reasonElement: HTMLParagraphElement | null = document.getElementById('reason') as HTMLParagraphElement
			const ingredientsListElement: HTMLUListElement | null = document.getElementById('ingredientsList') as HTMLUListElement

			if (error) {
				if (veganStatusElement) veganStatusElement.textContent = `Error: ${error.message}`
				if (reasonElement) reasonElement.textContent = ''
				if (ingredientsListElement) ingredientsListElement.innerHTML = ''
			} else if (results) {
				const { isVegan, ingredients, reason } = results
				if (veganStatusElement) {
					veganStatusElement.textContent = isVegan ? 'Vegan' : 'Not Vegan'
					veganStatusElement.className = isVegan ? 'text-green-500 font-bold text-2xl' : 'text-red-500 font-bold text-2xl'
				}
				if (reasonElement) reasonElement.textContent = `${reason}`
				if (ingredientsListElement) {
					ingredientsListElement.innerHTML = ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')
				}
			}

		} catch (error) {
			console.error('Error in checkIfVegan:', error)
			alert('An error occurred while checking the image')
			const veganStatusElement: HTMLHeadingElement | null = document.getElementById('veganStatus') as HTMLHeadingElement
			const reasonElement: HTMLParagraphElement | null = document.getElementById('reason') as HTMLParagraphElement
			const ingredientsListElement: HTMLUListElement | null = document.getElementById('ingredientsList') as HTMLUListElement

			if (veganStatusElement) veganStatusElement.textContent = 'Error: An error occurred while checking the image'
			if (reasonElement) reasonElement.textContent = ''
			if (ingredientsListElement) ingredientsListElement.innerHTML = ''
		}
	}

	// New helper function to convert Blob to base64
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
			reader.onerror = error => reject(error)
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
			<div id="analysis" class="w-full flex justify-center mt-4">
				<div class="result-box">
					<p id="veganStatus" class=""></p>
					<p id="reason" class="mb-4"></p>
					<h3 class="font-semibold mb-2">Ingredients:</h3>
					<ul id="ingredientsList"></ul>
				</div>
			</div>
		</div>
	</div>
	aabd
</div>

<style>
	.result-box {
		background-color: #f9f9f9;
		border: 1px solid #ddd;
		padding: 16px;
		border-radius: 8px;
		width: 80%;
		max-width: 600px;
		text-align: left; /* Left-align text */
	}
	.result-box h2, .result-box p, .result-box h3, .result-box ul {
		margin-bottom: 16px; /* Add space between entries */
	}
</style>
