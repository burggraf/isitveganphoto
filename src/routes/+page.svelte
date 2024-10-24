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

			const analysisElement: HTMLDivElement | null = document.getElementById('analysis') as HTMLDivElement
			if (analysisElement) {
				if (error) {
					analysisElement.textContent = `Error: ${error.message}`
				} else {
					analysisElement.textContent = `Result: ${JSON.stringify(data, null, 2)}`
				}
			}

			if (data && data.isVegan) {
				alert('Vegan!')
			} else if (data && !data.isVegan) {
				alert('Not vegan!')
			} else {
				alert('Unable to determine if vegan')
			}
		} catch (error) {
			console.error('Error in checkIfVegan:', error)
			alert('An error occurred while checking the image')
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
			<div id="analysis"></div>
		</div>
	</div>
	aabc
</div>
